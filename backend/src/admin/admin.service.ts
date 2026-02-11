import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../transactions/entities/payment.entity';
import { Refund, RefundStatus } from '../transactions/entities/refund.entity';
import { Withdrawal, WithdrawalStatus } from '../transactions/entities/withdrawal.entity';
import { SupportTicket, TicketStatus } from '../support/entities/support-ticket.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundsRepository: Repository<Refund>,
    @InjectRepository(Withdrawal)
    private withdrawalsRepository: Repository<Withdrawal>,
    @InjectRepository(SupportTicket)
    private ticketsRepository: Repository<SupportTicket>,
  ) {}

  async getDashboardOverview() {
    const [usersTotal, workersOnline, ordersPending, ticketsOpen] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { workerOnline: 1 } }),
      this.ordersRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.OPEN } }),
    ]);

    const [paidRow, refundRow, withdrawalPending] = await Promise.all([
      this.paymentsRepository
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.SUCCESS })
        .getRawOne<{ total: string }>(),
      this.refundsRepository
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.refundAmount), 0)', 'total')
        .where('r.status = :status', { status: RefundStatus.SUCCESS })
        .getRawOne<{ total: string }>(),
      this.withdrawalsRepository.count({ where: { status: WithdrawalStatus.PENDING } }),
    ]);

    return {
      usersTotal,
      workersOnline,
      ordersPending,
      ticketsOpen,
      paidAmount: Number(paidRow?.total || 0),
      refundAmount: Number(refundRow?.total || 0),
      withdrawalsPending: withdrawalPending,
    };
  }

  async listUsers(page = 1, pageSize = 20) {
    const [list, total] = await this.usersRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }

  async listOrders(page = 1, pageSize = 20, status?: OrderStatus) {
    const where = status !== undefined ? { status } : {};
    const [list, total] = await this.ordersRepository.findAndCount({
      where,
      relations: ['customer', 'worker'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }

  async listPayments(page = 1, pageSize = 20, status?: PaymentStatus) {
    const where = status ? { status } : {};
    const [list, total] = await this.paymentsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }

  async listRefunds(page = 1, pageSize = 20, status?: RefundStatus) {
    const where = status ? { status } : {};
    const [list, total] = await this.refundsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }

  async listWithdrawals(page = 1, pageSize = 20, status?: WithdrawalStatus) {
    const where = status !== undefined ? { status } : {};
    const [list, total] = await this.withdrawalsRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }

  async listTickets(page = 1, pageSize = 20, status?: TicketStatus) {
    const where = status !== undefined ? { status } : {};
    const [list, total] = await this.ticketsRepository.findAndCount({
      where,
      relations: ['user', 'order'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }
}
