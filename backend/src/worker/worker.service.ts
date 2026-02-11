import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';
import { Settlement } from '../transactions/entities/settlement.entity';

@Injectable()
export class WorkerService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(Settlement)
    private settlementsRepository: Repository<Settlement>,
  ) {}

  async setOnlineStatus(userId: number, online: boolean, lat?: number, lng?: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    user.workerOnline = online ? 1 : 0;
    user.workerLastOnlineAt = new Date();

    if (typeof lat === 'number' && typeof lng === 'number') {
      user.lat = lat;
      user.lng = lng;
    }

    await this.usersRepository.save(user);
    return {
      userId,
      workerOnline: !!user.workerOnline,
      workerLastOnlineAt: user.workerLastOnlineAt,
      lat: user.lat,
      lng: user.lng,
    };
  }

  async getIncomeSummary(workerId: number) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayRow, monthRow, totalRow] = await Promise.all([
      this.transactionsRepository
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where('t.userId = :workerId', { workerId })
        .andWhere('t.type = :type', { type: TransactionType.INCOME })
        .andWhere('t.created_at BETWEEN :startAt AND :endAt', { startAt: startOfToday, endAt: now })
        .getRawOne<{ total: string }>(),
      this.transactionsRepository
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where('t.userId = :workerId', { workerId })
        .andWhere('t.type = :type', { type: TransactionType.INCOME })
        .andWhere('t.created_at BETWEEN :startAt AND :endAt', { startAt: startOfMonth, endAt: now })
        .getRawOne<{ total: string }>(),
      this.transactionsRepository
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where('t.userId = :workerId', { workerId })
        .andWhere('t.type = :type', { type: TransactionType.INCOME })
        .getRawOne<{ total: string }>(),
    ]);

    const [pendingSettlements, settledCount] = await Promise.all([
      this.settlementsRepository.count({ where: { workerId, status: 'pending' as any } }),
      this.settlementsRepository.count({ where: { workerId } }),
    ]);

    return {
      todayIncome: Number(todayRow?.total || 0),
      monthIncome: Number(monthRow?.total || 0),
      totalIncome: Number(totalRow?.total || 0),
      settledCount,
      pendingSettlements,
    };
  }

  async getIncomeDetails(workerId: number, page = 1, pageSize = 20) {
    if (page <= 0 || pageSize <= 0) {
      throw new BadRequestException('分页参数不合法');
    }
    const [list, total] = await this.transactionsRepository.findAndCount({
      where: {
        userId: workerId,
        type: TransactionType.INCOME,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }
}
