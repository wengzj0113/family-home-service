import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserCoupon } from './user-coupon.entity';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // 抵扣金额

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderAmount: number; // 最低消费金额

  @Column({ type: 'datetime', nullable: true })
  expireAt: Date;

  @Column({ default: 0 })
  totalQuantity: number; // 总发行量，0表示不限

  @Column({ default: 0 })
  receivedQuantity: number; // 已领取量

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => UserCoupon, (userCoupon) => userCoupon.coupon)
  userCoupons: UserCoupon[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
