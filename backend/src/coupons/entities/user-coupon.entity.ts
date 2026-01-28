import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Coupon } from './coupon.entity';

export enum UserCouponStatus {
  UNUSED = 0,
  USED = 1,
  EXPIRED = 2,
}

@Entity('user_coupons')
export class UserCoupon {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => Coupon)
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column({ name: 'coupon_id' })
  couponId: number;

  @Column({
    type: 'tinyint',
    default: UserCouponStatus.UNUSED,
  })
  status: UserCouponStatus;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt: Date;

  @Column({ name: 'order_id', nullable: true })
  orderId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
