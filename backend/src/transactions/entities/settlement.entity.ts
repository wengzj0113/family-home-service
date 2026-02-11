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

export enum SettlementStatus {
  PENDING = 'pending', // 待结算
  CALCULATED = 'calculated', // 已计算
  SETTLED = 'settled', // 已结算
  WITHDRAWN = 'withdrawn', // 已提现
}

@Entity('settlements')
@Index(['orderId'])
@Index(['workerId'])
@Index(['status'])
export class Settlement {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', unique: true })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'bigint' })
  workerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount: number; // 订单金额

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  commissionRate: number; // 佣金比例

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number; // 佣金金额

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  netAmount: number; // 实际收入（订单金额 - 佣金）

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformSubsidy: number; // 平台补贴

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deductionAmount: number; // 扣款金额（如罚款）

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  finalAmount: number; // 最终结算金额

  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING,
  })
  status: SettlementStatus;

  @Column({ type: 'datetime', nullable: true })
  settledAt: Date; // 结算时间

  @Column({ type: 'datetime', nullable: true })
  withdrawableAt: Date; // 可提现时间

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  remark: string; // 备注
}
