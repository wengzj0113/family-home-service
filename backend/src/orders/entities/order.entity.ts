import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum OrderStatus {
  PENDING = 0,    // 待抢单
  GRABBED = 1,    // 已接单/待出发
  COMPLETED = 2,  // 已完成/待支付
  CANCELLED = 3,  // 已取消
  PAID = 4,       // 已支付
  DEPARTED = 5,   // 师傅已出发
  ARRIVED = 6,    // 师傅已到达
  STARTED = 7,    // 服务中
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_no', unique: true })
  orderNo: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @Column({ name: 'worker_id', nullable: true })
  workerId: number;

  @Column({ name: 'service_type' })
  serviceType: string;

  @Column({ name: 'service_time' })
  serviceTime: Date;

  @Column()
  location: string;

  @Column({ name: 'address_detail', type: 'text', nullable: true })
  addressDetail: string;

  @Column({ name: 'user_coupon_id', nullable: true })
  userCouponId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  couponAmount: number;

  @Column({ name: 'estimated_duration', nullable: true })
  estimatedDuration: string; // 预计时长，如 "2小时"

  @Column({ name: 'needs_tools', default: false })
  needsTools: boolean; // 是否需要自带工具

  @Column({ name: 'completed_items', type: 'text', nullable: true })
  completedItems: string; // 已完成的服务项，逗号分隔

  @Column({ name: 'recommend_worker_id', nullable: true })
  recommendWorkerId: number; // 平台推荐的师傅 ID

  @Column({ name: 'has_insurance', default: true })
  hasInsurance: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number;

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'tinyint',
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
