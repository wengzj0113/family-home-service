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

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CLOSED = 'closed',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
  BALANCE = 'balance',
}

@Entity('payments')
@Index(['orderId'])
@Index(['userId'])
@Index(['tradeNo'])
@Index(['status'])
export class Payment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  outTradeNo: string; // 平台订单号（与 order.orderNo 关联）

  @Column({ type: 'varchar', length: 128, nullable: true })
  tradeNo: string; // 第三方支付订单号

  @Column({ type: 'bigint' })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.ALIPAY,
  })
  payType: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'json', nullable: true })
  payParams: Record<string, any>; // 支付参数（前端唤起支付所需）

  @Column({ type: 'json', nullable: true })
  notifyData: Record<string, any>; // 第三方回调原始数据

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientIp: string; // 客户端 IP

  @Column({ type: 'varchar', length: 255, nullable: true })
  channel: string; // 支付渠道（小程序/H5/App）

  @Column({ type: 'int', default: 0 })
  retryCount: number; // 重试次数

  @Column({ type: 'text', nullable: true })
  failReason: string; // 失败原因

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  successAt: Date; // 支付成功时间

  @Column({ type: 'datetime', nullable: true })
  expiredAt: Date; // 过期时间
}
