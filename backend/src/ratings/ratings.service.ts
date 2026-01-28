import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Rating, RatingRole } from './entities/rating.entity';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private ratingsRepository: Repository<Rating>,
    private usersService: UsersService,
    private ordersService: OrdersService,
    private dataSource: DataSource,
  ) {}

  async create(userId: number, body: any) {
    const { orderId, score, content } = body;
    
    // 1. Get order and check status
    const order = await this.ordersService.findById(orderId);
    if (!order) throw new BadRequestException('订单不存在');
    if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('订单未完成，无法评价');
    }

    // 2. Determine roles
    let role: RatingRole;
    let toUserId: number;
    if (userId === order.customerId) {
      role = RatingRole.CUSTOMER_TO_WORKER;
      toUserId = order.workerId;
    } else if (userId === order.workerId) {
      role = RatingRole.WORKER_TO_CUSTOMER;
      toUserId = order.customerId;
    } else {
      throw new BadRequestException('您无权评价此订单');
    }

    // 3. Check if already rated
    const existing = await this.ratingsRepository.findOne({
      where: { orderId, fromUserId: userId, role },
    });
    if (existing) throw new BadRequestException('您已经评价过该订单了');

    // 4. Save rating and update user average score
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rating = this.ratingsRepository.create({
        orderId,
        fromUserId: userId,
        toUserId,
        role,
        score,
        content,
      });
      await queryRunner.manager.save(rating);

      // Update target user scores
      const targetUser = await this.usersService.findById(toUserId);
      if (targetUser) {
        const ratings = await this.ratingsRepository.find({ where: { toUserId, role } });
        const totalScore = ratings.reduce((sum, r) => sum + r.score, 0) + score;
        const avgScore = totalScore / (ratings.length + 1);
        
        if (role === RatingRole.CUSTOMER_TO_WORKER) {
          targetUser.workerScore = parseFloat(avgScore.toFixed(2));
        } else {
          targetUser.customerScore = parseFloat(avgScore.toFixed(2));
        }
        targetUser.ratingCount = (targetUser.ratingCount || 0) + 1;
        targetUser.exp = (targetUser.exp || 0) + 10; // 10 exp per rating

        // Update Level logic
        const currentScore = role === RatingRole.CUSTOMER_TO_WORKER ? targetUser.workerScore : targetUser.customerScore;
        const count = targetUser.ratingCount;
        
        if (currentScore >= 4.8 && count >= 50) targetUser.level = 5;
        else if (currentScore >= 4.5 && count >= 20) targetUser.level = 4;
        else if (currentScore >= 4.0 && count >= 10) targetUser.level = 3;
        else if (currentScore < 3.0) targetUser.level = 1;
        else targetUser.level = 2;

        await queryRunner.manager.save(targetUser);
      }

      await queryRunner.commitTransaction();
      return rating;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByToUser(toUserId: number) {
    return this.ratingsRepository.find({
      where: { toUserId },
      relations: ['fromUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async getWorkerSummary(workerId: number) {
    const worker = await this.usersService.findById(workerId);
    if (!worker || !worker.roles.includes(UserRole.WORKER)) return null;
    const ratings = await this.findByToUser(workerId);
    return {
      id: worker.id,
      nickname: worker.nickname,
      avatar: worker.avatar,
      workerScore: worker.workerScore,
      ratingCount: worker.ratingCount,
      level: worker.level,
      profile: worker.profile,
      ratings: ratings.map(r => ({
        id: r.id,
        score: r.score,
        content: r.content,
        createdAt: r.createdAt,
        fromNickname: r.fromUser?.nickname,
        fromAvatar: r.fromUser?.avatar,
      })),
    };
  }
}
