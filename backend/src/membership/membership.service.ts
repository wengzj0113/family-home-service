import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { MemberLevel } from './entities/member-level.entity';
import { PointsRecord, PointsRecordType } from './entities/points-record.entity';
import { PointsMallItem } from './entities/points-mall-item.entity';
import { PointsExchange, PointsExchangeStatus } from './entities/points-exchange.entity';

@Injectable()
export class MembershipService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(MemberLevel)
    private levelsRepository: Repository<MemberLevel>,
    @InjectRepository(PointsRecord)
    private recordsRepository: Repository<PointsRecord>,
    @InjectRepository(PointsMallItem)
    private mallItemsRepository: Repository<PointsMallItem>,
    @InjectRepository(PointsExchange)
    private exchangesRepository: Repository<PointsExchange>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const count = await this.levelsRepository.count();
    if (count > 0) return;

    const defaults = [
      { level: 1, name: '普通会员', minExp: 0, minPoints: 0, discountRate: 1.0, workerCommissionRate: 1.0 },
      { level: 2, name: '白银会员', minExp: 100, minPoints: 500, discountRate: 0.98, workerCommissionRate: 0.98 },
      { level: 3, name: '黄金会员', minExp: 300, minPoints: 1500, discountRate: 0.95, workerCommissionRate: 0.95 },
      { level: 4, name: '铂金会员', minExp: 800, minPoints: 4000, discountRate: 0.92, workerCommissionRate: 0.92 },
      { level: 5, name: '黑金会员', minExp: 2000, minPoints: 10000, discountRate: 0.9, workerCommissionRate: 0.9 },
    ];
    await this.levelsRepository.save(defaults);
  }

  async getMyProfile(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const levelConfig = await this.levelsRepository.findOne({
      where: { level: user.level, isActive: 1 },
    });

    return {
      id: user.id,
      level: user.level,
      exp: user.exp || 0,
      points: user.points || 0,
      levelConfig,
    };
  }

  async getMyPointsRecords(userId: number, page = 1, pageSize = 20) {
    const [list, total] = await this.recordsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total };
  }

  async listLevels() {
    return this.levelsRepository.find({ where: { isActive: 1 }, order: { level: 'ASC' } });
  }

  async upsertLevel(payload: Partial<MemberLevel>) {
    if (!payload.level || !payload.name) {
      throw new BadRequestException('等级和名称必填');
    }
    let level = await this.levelsRepository.findOne({ where: { level: payload.level } });
    if (!level) {
      level = this.levelsRepository.create(payload);
    } else {
      Object.assign(level, payload);
    }
    return this.levelsRepository.save(level);
  }

  async adjustUserPoints(
    userId: number,
    pointsDelta: number,
    type: PointsRecordType,
    source = 'manual_adjust',
    remark?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('用户不存在');

      const nextPoints = Number(user.points || 0) + pointsDelta;
      if (nextPoints < 0) throw new BadRequestException('积分不足');

      user.points = nextPoints;
      await queryRunner.manager.save(user);

      const record = queryRunner.manager.create(PointsRecord, {
        userId,
        type,
        pointsChange: pointsDelta,
        balanceAfter: nextPoints,
        source,
        remark,
      });
      await queryRunner.manager.save(record);

      await queryRunner.commitTransaction();
      return { userId, points: nextPoints };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async listMallItems(page = 1, pageSize = 20) {
    const [list, total] = await this.mallItemsRepository.findAndCount({
      where: { isActive: 1 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }

  async createMallItem(payload: Partial<PointsMallItem>) {
    if (!payload.title || !payload.pointsCost) {
      throw new BadRequestException('商品名称和积分价格必填');
    }
    const item = this.mallItemsRepository.create({
      title: payload.title,
      description: payload.description || '',
      pointsCost: payload.pointsCost,
      stock: payload.stock || 0,
      cover: payload.cover || '',
      isActive: payload.isActive ?? 1,
    });
    return this.mallItemsRepository.save(item);
  }

  async exchangeItem(userId: number, itemId: number, quantity = 1) {
    if (quantity <= 0) throw new BadRequestException('兑换数量非法');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('用户不存在');

      const item = await queryRunner.manager.findOne(PointsMallItem, { where: { id: itemId } });
      if (!item || item.isActive !== 1) throw new NotFoundException('商品不存在或已下架');
      if (item.stock < quantity) throw new BadRequestException('库存不足');

      const totalPoints = Number(item.pointsCost) * quantity;
      if (Number(user.points || 0) < totalPoints) throw new BadRequestException('积分不足');

      user.points = Number(user.points || 0) - totalPoints;
      item.stock = item.stock - quantity;
      item.soldCount = Number(item.soldCount || 0) + quantity;
      await queryRunner.manager.save(user);
      await queryRunner.manager.save(item);

      const exchange = queryRunner.manager.create(PointsExchange, {
        userId,
        itemId,
        quantity,
        totalPoints,
        status: PointsExchangeStatus.COMPLETED,
        exchangeNo: `EX${Date.now()}${Math.floor(Math.random() * 1000)}`,
      });
      await queryRunner.manager.save(exchange);

      const record = queryRunner.manager.create(PointsRecord, {
        userId,
        type: PointsRecordType.SPEND,
        pointsChange: -totalPoints,
        balanceAfter: user.points,
        source: 'points_mall',
        bizId: String(exchange.id),
        remark: `兑换商品：${item.title} x ${quantity}`,
      });
      await queryRunner.manager.save(record);

      await queryRunner.commitTransaction();
      return exchange;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
