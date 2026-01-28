import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('worker_profiles')
export class WorkerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'real_name', nullable: true })
  realName: string;

  @Column({ name: 'id_card_no', nullable: true })
  idCardNo: string;

  @Column({ name: 'id_card_front', nullable: true })
  idCardFront: string;

  @Column({ name: 'id_card_back', nullable: true })
  idCardBack: string;

  @Column({ name: 'id_card_hand', nullable: true })
  idCardHand: string;

  @Column({ name: 'health_certificate', nullable: true })
  healthCertificate: string;

  @Column({ type: 'text', nullable: true })
  introduction: string; // 自我介绍

  @Column({ default: 0 })
  experience: number; // 从业年限

  @Column({ type: 'text', nullable: true })
  skills: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.00 })
  rating: number;

  @Column({ name: 'credit_score', default: 100 })
  creditScore: number;

  @Column({ name: 'service_count', default: 0 })
  serviceCount: number;

  @Column({ name: 'audit_status', default: 0 })
  auditStatus: number;

  @Column({ name: 'background_check_status', default: 0 })
  backgroundCheckStatus: number; // 0:未调查, 1:已通过, 2:有异常

  @Column({ name: 'health_cert_status', default: 0 })
  healthCertStatus: number; // 0:未审核, 1:已审核, 2:已过期

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
