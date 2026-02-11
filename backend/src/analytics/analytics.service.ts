import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';
import { Payment, PaymentStatus } from '../transactions/entities/payment.entity';
import { Refund, RefundStatus } from '../transactions/entities/refund.entity';
import { Settlement } from '../transactions/entities/settlement.entity';

type DateRange = {
  startAt: Date;
  endAt: Date;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundsRepository: Repository<Refund>,
    @InjectRepository(Settlement)
    private settlementsRepository: Repository<Settlement>,
  ) {}

  async getOverview(range?: DateRange) {
    const dateWhere = range ? Between(range.startAt, range.endAt) : undefined;

    const [totalUsers, newUsers, totalOrders] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: dateWhere ? { createdAt: dateWhere } : {} }),
      this.ordersRepository.count(),
    ]);

    const [paidOrders, completedOrders] = await Promise.all([
      this.ordersRepository.count({
        where: {
          ...(dateWhere ? { createdAt: dateWhere } : {}),
          status: OrderStatus.PAID,
        },
      }),
      this.ordersRepository.count({
        where: {
          ...(dateWhere ? { createdAt: dateWhere } : {}),
          status: OrderStatus.COMPLETED,
        },
      }),
    ]);

    const gmvRaw = await this.ordersRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount), 0)', 'total')
      .where('o.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.COMPLETED] })
      .andWhere(range ? 'o.created_at BETWEEN :startAt AND :endAt' : '1=1', {
        startAt: range?.startAt,
        endAt: range?.endAt,
      })
      .getRawOne<{ total: string }>();

    const paidAmountRaw = await this.paymentsRepository
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .andWhere(range ? 'p.createdAt BETWEEN :startAt AND :endAt' : '1=1', {
        startAt: range?.startAt,
        endAt: range?.endAt,
      })
      .getRawOne<{ total: string }>();

    const commissionRaw = await this.transactionsRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.type = :type', { type: TransactionType.COMMISSION })
      .andWhere(range ? 't.created_at BETWEEN :startAt AND :endAt' : '1=1', {
        startAt: range?.startAt,
        endAt: range?.endAt,
      })
      .getRawOne<{ total: string }>();

    return {
      users: {
        total: totalUsers,
        new: newUsers,
      },
      orders: {
        total: totalOrders,
        paid: paidOrders,
        completed: completedOrders,
      },
      finance: {
        gmv: Number(gmvRaw?.total || 0),
        paidAmount: Number(paidAmountRaw?.total || 0),
        commission: Number(commissionRaw?.total || 0),
      },
    };
  }

  async getOrderTrend(days = 7) {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select('DATE(o.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.amount), 0)', 'amount')
      .where('o.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
      .groupBy('DATE(o.created_at)')
      .orderBy('DATE(o.created_at)', 'ASC')
      .getRawMany<{ date: string; count: string; amount: string }>();

    return rows.map((item) => ({
      date: item.date,
      orderCount: Number(item.count || 0),
      orderAmount: Number(item.amount || 0),
    }));
  }

  async getFinanceTrend(days = 7) {
    const [paymentRows, refundRows, incomeRows] = await Promise.all([
      this.paymentsRepository
        .createQueryBuilder('p')
        .select('DATE(p.createdAt)', 'date')
        .addSelect('COALESCE(SUM(p.amount), 0)', 'amount')
        .where('p.status = :status', { status: PaymentStatus.SUCCESS })
        .andWhere('p.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
        .groupBy('DATE(p.createdAt)')
        .getRawMany<{ date: string; amount: string }>(),
      this.refundsRepository
        .createQueryBuilder('r')
        .select('DATE(r.createdAt)', 'date')
        .addSelect('COALESCE(SUM(r.refundAmount), 0)', 'amount')
        .where('r.status = :status', { status: RefundStatus.SUCCESS })
        .andWhere('r.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
        .groupBy('DATE(r.createdAt)')
        .getRawMany<{ date: string; amount: string }>(),
      this.settlementsRepository
        .createQueryBuilder('s')
        .select('DATE(s.createdAt)', 'date')
        .addSelect('COALESCE(SUM(s.finalAmount), 0)', 'amount')
        .where('s.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
        .groupBy('DATE(s.createdAt)')
        .getRawMany<{ date: string; amount: string }>(),
    ]);

    const dateMap = new Map<string, { date: string; paymentAmount: number; refundAmount: number; workerIncome: number }>();

    for (const row of paymentRows) {
      const existed = dateMap.get(row.date) || {
        date: row.date,
        paymentAmount: 0,
        refundAmount: 0,
        workerIncome: 0,
      };
      existed.paymentAmount = Number(row.amount || 0);
      dateMap.set(row.date, existed);
    }

    for (const row of refundRows) {
      const existed = dateMap.get(row.date) || {
        date: row.date,
        paymentAmount: 0,
        refundAmount: 0,
        workerIncome: 0,
      };
      existed.refundAmount = Number(row.amount || 0);
      dateMap.set(row.date, existed);
    }

    for (const row of incomeRows) {
      const existed = dateMap.get(row.date) || {
        date: row.date,
        paymentAmount: 0,
        refundAmount: 0,
        workerIncome: 0,
      };
      existed.workerIncome = Number(row.amount || 0);
      dateMap.set(row.date, existed);
    }

    return Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        netIncome: Number((item.paymentAmount - item.refundAmount).toFixed(2)),
      }));
  }

  async getRefundSummary(range?: DateRange) {
    const whereDate = range ? 'r.createdAt BETWEEN :startAt AND :endAt' : '1=1';
    const params = range
      ? {
          startAt: range.startAt,
          endAt: range.endAt,
        }
      : {};

    const [statusRows, amountRow] = await Promise.all([
      this.refundsRepository
        .createQueryBuilder('r')
        .select('r.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where(whereDate, params)
        .groupBy('r.status')
        .getRawMany<{ status: RefundStatus; count: string }>(),
      this.refundsRepository
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.refundAmount), 0)', 'refundAmount')
        .where('r.status = :status', { status: RefundStatus.SUCCESS })
        .andWhere(whereDate, params)
        .getRawOne<{ refundAmount: string }>(),
    ]);

    return {
      totalRefundAmount: Number(amountRow?.refundAmount || 0),
      statusBreakdown: statusRows.map((row) => ({
        status: row.status,
        count: Number(row.count || 0),
      })),
    };
  }

  async getWorkerIncomeTop(days = 30, limit = 10) {
    const rows = await this.settlementsRepository
      .createQueryBuilder('s')
      .leftJoin(User, 'u', 'u.id = s.workerId')
      .select('s.workerId', 'workerId')
      .addSelect('u.nickname', 'nickname')
      .addSelect('u.avatar', 'avatar')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('COALESCE(SUM(s.finalAmount), 0)', 'incomeAmount')
      .where('s.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
      .groupBy('s.workerId')
      .addGroupBy('u.nickname')
      .addGroupBy('u.avatar')
      .orderBy('incomeAmount', 'DESC')
      .limit(limit)
      .getRawMany<{
        workerId: string;
        nickname: string;
        avatar: string;
        orderCount: string;
        incomeAmount: string;
      }>();

    return rows.map((row) => ({
      workerId: Number(row.workerId),
      nickname: row.nickname || '师傅',
      avatar: row.avatar || '',
      orderCount: Number(row.orderCount || 0),
      incomeAmount: Number(row.incomeAmount || 0),
    }));
  }

  async exportOverviewCsv(range?: DateRange) {
    const [overview, orderTrend, financeTrend, refundSummary] = await Promise.all([
      this.getOverview(range),
      this.getOrderTrend(7),
      this.getFinanceTrend(7),
      this.getRefundSummary(range),
    ]);

    const lines: string[] = [];
    lines.push('section,key,value');
    lines.push(`users,total,${overview.users.total}`);
    lines.push(`users,new,${overview.users.new}`);
    lines.push(`orders,total,${overview.orders.total}`);
    lines.push(`orders,paid,${overview.orders.paid}`);
    lines.push(`orders,completed,${overview.orders.completed}`);
    lines.push(`finance,gmv,${overview.finance.gmv}`);
    lines.push(`finance,paidAmount,${overview.finance.paidAmount}`);
    lines.push(`finance,commission,${overview.finance.commission}`);
    lines.push(`refund,totalRefundAmount,${refundSummary.totalRefundAmount}`);
    lines.push('');
    lines.push('order_trend,date,orderCount,orderAmount');
    for (const item of orderTrend) {
      lines.push(`order_trend,${item.date},${item.orderCount},${item.orderAmount}`);
    }
    lines.push('');
    lines.push('finance_trend,date,paymentAmount,refundAmount,workerIncome,netIncome');
    for (const item of financeTrend) {
      lines.push(
        `finance_trend,${item.date},${item.paymentAmount},${item.refundAmount},${item.workerIncome},${item.netIncome}`,
      );
    }

    return lines.join('\n');
  }
}
