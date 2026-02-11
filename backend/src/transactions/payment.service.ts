import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AlipaySdk } from 'alipay-sdk';
const WxPay = require('wechatpay-node-v3');
import { Payment, PaymentStatus, PaymentType } from './entities/payment.entity';
import { Refund, RefundStatus } from './entities/refund.entity';
import { Settlement, SettlementStatus } from './entities/settlement.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { PlatformConfig } from './entities/platform-config.entity';

@Injectable()
export class PaymentService {
  private alipaySdk: any;
  private wxPay: any;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundsRepository: Repository<Refund>,
    @InjectRepository(Settlement)
    private settlementsRepository: Repository<Settlement>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {
    this.initAlipay();
    this.initWxPay();
  }

  private initAlipay() {
    const appId = this.configService.get<string>('ALIPAY_APP_ID');
    const privateKey = this.configService.get<string>('ALIPAY_PRIVATE_KEY');
    const alipayPublicKey = this.configService.get<string>('ALIPAY_PUBLIC_KEY');
    const gateway = this.configService.get<string>('ALIPAY_GATEWAY');

    if (appId && privateKey && alipayPublicKey) {
      try {
        this.alipaySdk = new AlipaySdk({
          appId,
          privateKey,
          alipayPublicKey,
          gateway,
        });
        this.logger.log('Alipay SDK initialized');
      } catch (err) {
        this.logger.error('Alipay SDK initialization failed', err.message);
      }
    }
  }

  private initWxPay() {
    const appid = this.configService.get<string>('WECHAT_APPID');
    const mchid = this.configService.get<string>('WECHAT_MCH_ID');
    const serial_no = this.configService.get<string>('WECHAT_SERIAL_NO');
    const apiV3Key = this.configService.get<string>('WECHAT_API_V3_KEY');
    const privateKeyContent = this.configService.get<string>('WECHAT_PRIVATE_KEY');

    if (appid && mchid && serial_no && apiV3Key && privateKeyContent) {
      try {
        this.wxPay = new WxPay({
          appid,
          mchid,
          serial_no,
          privateKey: Buffer.from(privateKeyContent.replace(/\\n/g, '\n')),
          key: apiV3Key,
        });
        this.logger.log('WeChat Pay SDK initialized');
      } catch (err) {
        this.logger.error('WeChat Pay initialization failed', err.message);
      }
    }
  }

  /**
   * 创建支付
   */
  async createPayment(orderId: number, userId: number, payType: PaymentType, clientIp?: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.customerId !== userId) throw new ForbiddenException('无权支付此订单');

    // 检查订单状态
    const allowedStatus = [OrderStatus.PENDING, OrderStatus.COMPLETED]; // 待抢单或已完成待支付
    if (!allowedStatus.includes(order.status)) {
      throw new BadRequestException('订单当前状态不可支付');
    }

    // 检查是否已有支付成功的记录
    const existingSuccess = await this.paymentsRepository.findOne({
      where: { orderId, status: PaymentStatus.SUCCESS },
    });
    if (existingSuccess) throw new BadRequestException('订单已支付成功');

    const amount = order.amount;
    const outTradeNo = `${order.orderNo}_${Date.now()}`;

    let payParams: any;
    if (payType === PaymentType.ALIPAY) {
      payParams = await this.createAlipayOrder(outTradeNo, amount, `家政服务-${order.serviceType}`);
    } else if (payType === PaymentType.WECHAT) {
      // 当前项目用户表无 wechatOpenid 字段，先返回 APP/H5 可用的 Native 下单参数
      payParams = await this.createWxNativeOrder(outTradeNo, amount, `家政服务-${order.serviceType}`);
    } else {
      throw new BadRequestException('暂不支持的支付方式');
    }

    const payment = await this.paymentsRepository.save({
      outTradeNo,
      orderId,
      userId,
      amount,
      payType,
      status: PaymentStatus.PENDING,
      payParams,
      clientIp,
    });

    return payment;
  }

  private async createAlipayOrder(outTradeNo: string, amount: number, subject: string) {
    if (!this.alipaySdk) throw new BadRequestException('支付宝未配置');
    // 返回支付参数，前端通过这些参数唤起支付宝
    return this.alipaySdk.exec('alipay.trade.app.pay', {
      bizContent: {
        outTradeNo,
        totalAmount: amount.toFixed(2),
        subject,
        productCode: 'QUICK_MSECURITY_PAY',
      },
      notifyUrl: this.configService.get('ALIPAY_NOTIFY_URL'),
    });
  }

  private async createWxNativeOrder(outTradeNo: string, amount: number, description: string) {
    if (!this.wxPay) throw new BadRequestException('微信支付未配置');
    return this.wxPay.transactions_native({
      description,
      out_trade_no: outTradeNo,
      notify_url: this.configService.get('WECHAT_NOTIFY_URL'),
      amount: { total: Math.round(amount * 100) },
    });
  }

  /**
   * 处理支付宝异步通知
   */
  async handleAlipayNotify(body: any) {
    if (!this.alipaySdk) {
      this.logger.error('Alipay SDK unavailable');
      return 'fail';
    }
    const isValid = await this.alipaySdk.checkNotifySign(body);
    if (!isValid) {
      this.logger.error('Alipay notify signature invalid');
      return 'fail';
    }

    const { out_trade_no, trade_no, trade_status, total_amount } = body;
    const payment = await this.paymentsRepository.findOne({
      where: { outTradeNo: out_trade_no },
      relations: ['order'],
    });

    if (!payment) return 'fail';
    if (payment.status === PaymentStatus.SUCCESS) return 'success';

    if (trade_status === 'TRADE_SUCCESS') {
      await this.processPaymentSuccess(payment, trade_no, body);
    } else {
      await this.paymentsRepository.update(payment.id, {
        status: PaymentStatus.FAILED,
        notifyData: body,
      });
    }

    return 'success';
  }

  /**
   * 处理微信支付通知
   */
  async handleWxNotify(headers: any, body: any) {
    if (!this.wxPay) {
      this.logger.error('WxPay SDK unavailable');
      return { code: 'FAIL', message: 'FAIL' };
    }
    const result = await this.wxPay.decipher_notifyv3(headers, body);
    if (!result || result.trade_state !== 'SUCCESS') {
      this.logger.error('WxPay notify invalid or not success');
      return { code: 'FAIL', message: 'FAIL' };
    }

    const { out_trade_no, transaction_id, amount } = result;
    const payment = await this.paymentsRepository.findOne({
      where: { outTradeNo: out_trade_no },
      relations: ['order'],
    });

    if (!payment || payment.status === PaymentStatus.SUCCESS) {
      return { code: 'SUCCESS', message: 'OK' };
    }

    await this.processPaymentSuccess(payment, transaction_id, result);
    return { code: 'SUCCESS', message: 'OK' };
  }

  private async processPaymentSuccess(payment: Payment, tradeNo: string, notifyData: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 更新支付记录
      await queryRunner.manager.update(Payment, payment.id, {
        status: PaymentStatus.SUCCESS,
        tradeNo,
        notifyData,
        successAt: new Date(),
      });

      // 2. 更新订单状态
      await queryRunner.manager.update(Order, payment.orderId, {
        status: OrderStatus.PAID, // 统一使用 SKILL 文档建议的 PAID = 4
      });

      // 3. 记录交易流水
      await this.createTransactionRecord(queryRunner.manager, {
        userId: payment.userId,
        orderId: payment.orderId,
        type: TransactionType.PAYMENT,
        amount: -payment.amount,
        status: 1,
      });

      // 4. 触发结算逻辑
      await this.createSettlement(payment.orderId, queryRunner.manager);

      await queryRunner.commitTransaction();

      // 发送通知
      const order = await this.ordersRepository.findOne({ where: { id: payment.orderId } });
      await this.notificationsService.send(
        payment.userId,
        '支付成功',
        `您的订单 ${order?.orderNo || payment.orderId} 已支付成功`,
        {
          type: NotificationType.FINANCE,
        },
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Process payment success failed: ${err.message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 创建结算记录
   */
  async createSettlement(orderId: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Settlement) : this.settlementsRepository;
    const orderRepo = manager ? manager.getRepository(Order) : this.ordersRepository;

    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['worker'],
    });

    if (!order || !order.workerId) return;

    const existed = await repo.findOne({ where: { orderId } });
    if (existed) return;

    // 获取佣金比例，默认 10%
    const commissionRate = await this.getCommissionRate();
    const commissionAmount = Number((order.amount * commissionRate).toFixed(2));
    const netAmount = Number((order.amount - commissionAmount).toFixed(2));

    await repo.save({
      orderId,
      workerId: order.workerId,
      orderAmount: order.amount,
      commissionRate,
      commissionAmount,
      netAmount,
      finalAmount: netAmount,
      status: SettlementStatus.PENDING,
    });
  }

  private async getCommissionRate(): Promise<number> {
    const config = await this.dataSource.getRepository(PlatformConfig).findOne({
      where: { configKey: 'commission_rate' },
    });
    return config ? parseFloat(config.configValue) : 0.1;
  }

  /**
   * 申请退款
   */
  async applyRefund(userId: number, orderId: number, reason: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.customerId !== userId) throw new ForbiddenException('权限不足');
    if (order.status !== OrderStatus.PAID) throw new BadRequestException('订单未支付或已退款');

    const payment = await this.paymentsRepository.findOneBy({ 
      orderId, 
      status: PaymentStatus.SUCCESS 
    });
    if (!payment) throw new BadRequestException('未找到支付成功的记录');

    // 计算退款金额
    const refundAmount = await this.calculateRefundAmount(order);

    const refund = await this.refundsRepository.save({
      refundNo: `REF_${Date.now()}_${orderId}`,
      orderId,
      paymentId: payment.id,
      userId,
      amount: order.amount,
      refundAmount,
      reason,
      status: RefundStatus.PENDING,
    });

    return refund;
  }

  private async calculateRefundAmount(order: Order): Promise<number> {
    const hoursUntilService =
      (new Date(order.serviceTime).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilService >= 24) return order.amount;
    if (hoursUntilService >= 2) return order.amount * 0.8;
    return order.amount * 0.5;
  }

  /**
   * 执行退款（管理员审核通过后）
   */
  async executeRefund(refundId: number, auditorId: number) {
    const refund = await this.refundsRepository.findOne({
      where: { id: refundId },
      relations: ['payment', 'order'],
    });

    if (!refund || refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('退款申请不存在或已处理');
    }

    try {
      let tradeNo = '';
      if (refund.payment.payType === PaymentType.ALIPAY) {
        if (!this.alipaySdk) {
          throw new BadRequestException('支付宝未配置');
        }
        const result = await this.alipaySdk.exec('alipay.trade.refund', {
          bizContent: {
            outTradeNo: refund.payment.outTradeNo,
            refundAmount: refund.refundAmount.toFixed(2),
            refundReason: refund.reason,
          },
        });
        tradeNo = result?.trade_no || '';
      } else if (refund.payment.payType === PaymentType.WECHAT) {
        if (!this.wxPay) {
          throw new BadRequestException('微信支付未配置');
        }
        const result = await this.wxPay.refunds({
          out_trade_no: refund.payment.outTradeNo,
          out_refund_no: refund.refundNo,
          amount: {
            refund: Math.round(refund.refundAmount * 100),
            total: Math.round(refund.amount * 100),
            currency: 'CNY',
          },
        });
        tradeNo = result?.refund_id || '';
      }

      await this.processRefundSuccess(refund, auditorId, tradeNo);
      return { success: true, refundNo: refund.refundNo };
    } catch (err) {
      this.logger.error(`Refund failed: ${err.message}`);
      await this.refundsRepository.update(refundId, {
        status: RefundStatus.FAILED,
        failReason: err.message,
      });
      throw err;
    }
  }

  private async processRefundSuccess(refund: Refund, auditorId: number, tradeNo?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(Refund, refund.id, {
        status: RefundStatus.SUCCESS,
        auditorId,
        auditedAt: new Date(),
        processedAt: new Date(),
        tradeNo: tradeNo || null,
      });

      await queryRunner.manager.update(Order, refund.orderId, {
        status: OrderStatus.CANCELLED, // 退款后订单设为已取消
      });

      await queryRunner.manager.update(Payment, refund.paymentId, {
        status: PaymentStatus.REFUNDED,
      });

      await this.createTransactionRecord(queryRunner.manager, {
        userId: refund.userId,
        orderId: refund.orderId,
        type: TransactionType.PAYMENT,
        amount: refund.refundAmount,
        status: 1,
      });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async createTransactionRecord(
    manager: EntityManager,
    payload: Pick<Transaction, 'userId' | 'orderId' | 'type' | 'amount' | 'status'>,
  ) {
    const existedLast = await manager.findOne(Transaction, {
      where: { userId: payload.userId },
      order: { id: 'DESC' },
    });
    const balanceAfter = existedLast ? Number(existedLast.balanceAfter) : 0;

    await manager.save(Transaction, {
      userId: payload.userId,
      orderId: payload.orderId,
      type: payload.type,
      amount: payload.amount,
      status: payload.status,
      balanceAfter,
    });
  }
}
