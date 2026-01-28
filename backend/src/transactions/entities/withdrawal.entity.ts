import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum WithdrawalStatus {
  PENDING = 0,    // 待审核
  APPROVED = 1,   // 已批准/处理中
  COMPLETED = 2,  // 已打款/完成
  REJECTED = 3,   // 已驳回
}

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  method: string; // 'wechat', 'alipay', 'bank'

  @Column({ name: 'account_info', type: 'text', nullable: true })
  accountInfo: string;

  @Column({
    type: 'tinyint',
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ name: 'admin_remark', type: 'text', nullable: true })
  adminRemark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
