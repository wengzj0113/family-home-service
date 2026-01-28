import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon, UserCouponStatus } from './entities/user-coupon.entity';

@Injectable()
export class CouponsService implements OnModuleInit {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private readonly userCouponRepository: Repository<UserCoupon>,
  ) {}

  async onModuleInit() {
    const count = await this.couponRepository.count();
    if (count === 0) {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const initialCoupons = [
        { title: '新用户立减券', amount: 10, minOrderAmount: 0, expireAt: futureDate, totalQuantity: 1000 },
        { title: '大扫除满减券', amount: 30, minOrderAmount: 200, expireAt: futureDate, totalQuantity: 500 },
        { title: '家电清洗专享', amount: 20, minOrderAmount: 100, expireAt: futureDate, totalQuantity: 500 },
      ];
      await this.couponRepository.save(initialCoupons);
    }
  }

  async findAllActive() {
    return this.couponRepository.find({
      where: {
        isActive: true,
        expireAt: MoreThan(new Date()),
      },
    });
  }

  async claimCoupon(userId: number, couponId: number) {
    const coupon = await this.couponRepository.findOne({ where: { id: couponId } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('优惠券不存在或已失效');
    
    if (coupon.expireAt && coupon.expireAt < new Date()) throw new BadRequestException('优惠券已过期');
    
    if (coupon.totalQuantity > 0 && coupon.receivedQuantity >= coupon.totalQuantity) {
      throw new BadRequestException('优惠券已领完');
    }

    const existing = await this.userCouponRepository.findOne({ where: { userId, couponId } });
    if (existing) throw new BadRequestException('您已领取过该优惠券');

    const userCoupon = this.userCouponRepository.create({
      userId,
      couponId,
      status: UserCouponStatus.UNUSED,
    });

    await this.couponRepository.increment({ id: couponId }, 'receivedQuantity', 1);
    return this.userCouponRepository.save(userCoupon);
  }

  async findMyCoupons(userId: number, status?: UserCouponStatus) {
    const where: any = { userId };
    if (status !== undefined) where.status = status;
    
    return this.userCouponRepository.find({
      where,
      relations: ['coupon'],
      order: { createdAt: 'DESC' },
    });
  }

  async getApplicableCoupons(userId: number, orderAmount: number) {
    const myUnusedCoupons = await this.userCouponRepository.find({
      where: { userId, status: UserCouponStatus.UNUSED },
      relations: ['coupon'],
    });

    return myUnusedCoupons.filter(uc => {
      const coupon = uc.coupon;
      if (coupon.expireAt && coupon.expireAt < new Date()) return false;
      return orderAmount >= Number(coupon.minOrderAmount);
    });
  }
}
