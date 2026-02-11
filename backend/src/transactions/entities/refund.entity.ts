import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { Payment } from './payment.entity';

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('refunds')
@Index(['orderId'])
@Index(['paymentId'])
@Index(['userId'])
@Index(['status'])
export class Refund {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  refundNo: string; // 退款单号

  @Column({ type: 'bigint' })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'bigint', nullable: true })
  paymentId: number;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Column({ type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // 退款金额

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundAmount: number; // 实际退款金额

  @Column({ type: 'varchar', length: 255, nullable: true })
  tradeNo: string; // 第三方退款交易号

  @Column({ type: 'text', nullable: true })
  reason: string; // 退款原因

  @Column({ type: 'text', nullable: true })
  userRemark: string; // 用户备注

  @Column({ type: 'int', default: 0 })
  retryCount: number; // 重试次数

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({ type: 'text', nullable: true })
  rejectReason: string; // 拒绝原因（管理员填写）

  @Column({ type: 'bigint', nullable: true })
  auditorId: number; // 审核人 ID

  @Column({ type: 'varchar', length: 64, nullable: true })
  auditorName: string; // 审核人名称

  @Column({ type: 'datetime', nullable: true })
  auditedAt: Date; // 审核时间

  @Column({ type: 'text', nullable: true })
  failReason: string; // 退款失败原因

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date; // 处理完成时间

  @Column({ type: 'datetime', nullable: true })
  expiredAt: Date; // 过期时间
}
