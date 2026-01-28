import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { PlatformConfig } from './entities/platform-config.entity';
import { Withdrawal, WithdrawalStatus } from './entities/withdrawal.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(PlatformConfig)
    private configRepository: Repository<PlatformConfig>,
    @InjectRepository(Withdrawal)
    private withdrawalsRepository: Repository<Withdrawal>,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  async getCommissionRate(): Promise<number> {
    const config = await this.configRepository.findOne({ where: { configKey: 'commission_rate' } });
    return config ? parseFloat(config.configValue) : 0.08; // Default 8%
  }

  async setCommissionRate(rate: number): Promise<void> {
    let config = await this.configRepository.findOne({ where: { configKey: 'commission_rate' } });
    if (!config) {
      config = this.configRepository.create({ configKey: 'commission_rate', configValue: rate.toString() });
    } else {
      config.configValue = rate.toString();
    }
    await this.configRepository.save(config);
  }

  async findByUser(userId: number): Promise<Transaction[]> {
    return this.transactionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPlatformStats(): Promise<any> {
    const totalRevenue = await this.transactionsRepository
      .createQueryBuilder('t')
      .where('t.type = :type', { type: TransactionType.COMMISSION })
      .select('SUM(t.amount)', 'total')
      .getRawOne();

    const totalOrders = await this.dataSource.manager.count(Order);
    const totalUsers = await this.dataSource.manager.count(User);
    const pendingOrders = await this.dataSource.manager.count(Order, { where: { status: OrderStatus.PENDING } });
    const pendingWithdrawals = await this.withdrawalsRepository.count({ where: { status: WithdrawalStatus.PENDING } });
    
    // GMV (Total Payment)
    const gmvResult = await this.transactionsRepository
      .createQueryBuilder('t')
      .where('t.type = :type', { type: TransactionType.INCOME }) // Worker income + Commission = Order Amount
      .select('SUM(t.amount)', 'total')
      .getRawOne();
    // Actually TransactionType.INCOME is just worker income. 
    // To get GMV, we should sum Order amounts where status is PAID or COMPLETED.
    const gmv = await this.dataSource.manager
      .createQueryBuilder(Order, 'o')
      .where('o.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.COMPLETED] })
      .select('SUM(o.amount)', 'total')
      .getRawOne();

    return {
      totalCommission: parseFloat(totalRevenue.total || 0),
      gmv: parseFloat(gmv.total || 0),
      totalOrders,
      totalUsers,
      pendingOrders,
      pendingWithdrawals
    };
  }

  async getOrderById(id: number): Promise<Order> {
    return this.dataSource.manager.findOne(Order, { where: { id } });
  }

  async handlePaymentSuccess(orderNo: string, tradeNo: string): Promise<void> {
    const order = await this.dataSource.manager.findOne(Order, { where: { orderNo } });
    if (!order) return;
    
    // 兼容逻辑：如果是待支付(2)状态，直接执行结算
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.PAID) {
      await this.settleOrder(order.id);
    }
  }

  async settleOrder(orderId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      
      // 如果订单已经是 PAID 或之后的后续状态，则跳过（防止重复结算）
      if (order.status === OrderStatus.PAID) return;

      const rate = await this.getCommissionRate();
      const commission = order.amount * rate;
      const workerIncome = order.amount - commission;

      // --- Dynamic Rates Logic ---
      const worker = await queryRunner.manager.findOne(User, { where: { id: order.workerId } });
      const customer = await queryRunner.manager.findOne(User, { where: { id: order.customerId } });

      let dynamicCommissionRate = rate;
      let customerDiscountRate = 0;

      if (worker) {
        const workerLevels = { 1: 0.12, 2: 0.10, 3: 0.08, 4: 0.06, 5: 0.05 };
        dynamicCommissionRate = workerLevels[worker.level] || rate;
      }

      if (customer) {
        const customerDiscounts = { 1: 0, 2: 0, 3: 0.02, 4: 0.05, 5: 0.08 };
        customerDiscountRate = customerDiscounts[customer.level] || 0;
      }

      // If both are Lv.5, additional 1% reduction for worker commission
      if (worker?.level === 5 && customer?.level === 5) {
        dynamicCommissionRate = Math.max(0.04, dynamicCommissionRate - 0.01);
      }

      const finalWorkerIncome = order.amount * (1 - dynamicCommissionRate);
      const finalCustomerPay = (order.amount * (1 - customerDiscountRate)) - Number(order.couponAmount || 0);
      const finalPlatformRevenue = finalCustomerPay - finalWorkerIncome;

      // Update worker balance
      const workerIncomeFixed = parseFloat(finalWorkerIncome.toFixed(2));
      if (worker) {
        worker.balance = Number(worker.balance) + workerIncomeFixed;
        await queryRunner.manager.save(worker);
      }

      // Create transaction for worker income
      const workerTransaction = this.transactionsRepository.create({
        orderId: order.id,
        userId: order.workerId,
        type: TransactionType.INCOME,
        amount: workerIncomeFixed,
        balanceAfter: worker ? worker.balance : 0,
        status: 1,
      });
      await queryRunner.manager.save(workerTransaction);

      // Update admin balance (platform revenue)
      const commissionFixed = parseFloat(finalPlatformRevenue.toFixed(2));
      const admin = await queryRunner.manager.findOne(User, { where: { id: 1 } });
      if (admin) {
        admin.balance = Number(admin.balance) + commissionFixed;
        await queryRunner.manager.save(admin);
      }

      const adminTransaction = this.transactionsRepository.create({
        orderId: order.id,
        userId: 1,
        type: TransactionType.COMMISSION,
        amount: commissionFixed,
        balanceAfter: admin ? admin.balance : 0,
        status: 1,
      });
      await queryRunner.manager.save(adminTransaction);

      // Update order status to PAID
      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      // 通知师傅收入到账
      if (order.workerId) {
        await this.notificationsService.create(
          order.workerId,
          '订单收入已入账',
          `订单 ${order.orderNo} 的收入已转入您的钱包余额。`,
          NotificationType.FINANCE,
        );
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // --- Withdrawal Logic ---

  async createWithdrawal(userId: number, body: any): Promise<Withdrawal> {
    const { amount, method, accountInfo } = body;
    const user = await this.dataSource.manager.findOne(User, { where: { id: userId } });
    
    if (!user || Number(user.balance) < amount) {
      throw new Error('余额不足');
    }

    const withdrawal = this.withdrawalsRepository.create({
      userId,
      amount,
      method,
      accountInfo,
      status: WithdrawalStatus.PENDING,
    });

    return this.withdrawalsRepository.save(withdrawal);
  }

  async findAllWithdrawals(): Promise<Withdrawal[]> {
    return this.withdrawalsRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async auditWithdrawal(id: number, status: WithdrawalStatus, remark?: string): Promise<void> {
    const withdrawal = await this.withdrawalsRepository.findOne({ where: { id } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== WithdrawalStatus.PENDING) throw new Error('Already audited');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      withdrawal.status = status;
      withdrawal.adminRemark = remark;
      await queryRunner.manager.save(withdrawal);

      if (status === WithdrawalStatus.COMPLETED) {
        // Deduct from user balance
        const user = await queryRunner.manager.findOne(User, { where: { id: withdrawal.userId } });
        if (user) {
          user.balance = Number(user.balance) - Number(withdrawal.amount);
          await queryRunner.manager.save(user);

          // Create transaction record
          const transaction = this.transactionsRepository.create({
            userId: user.id,
            type: TransactionType.WITHDRAWAL,
            amount: -withdrawal.amount,
            balanceAfter: user.balance,
            status: 1,
          });
          await queryRunner.manager.save(transaction);
        }
      }

      await queryRunner.commitTransaction();

      // 通知用户提现进度
      const statusText = status === WithdrawalStatus.COMPLETED ? '提现已成功打款' : '提现申请被驳回';
      await this.notificationsService.create(
        withdrawal.userId,
        statusText,
        status === WithdrawalStatus.COMPLETED 
          ? `您的提现申请（金额: ¥${withdrawal.amount}）已处理完成。`
          : `您的提现申请（金额: ¥${withdrawal.amount}）未通过审核。备注: ${remark || '无'}`,
        NotificationType.FINANCE,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
