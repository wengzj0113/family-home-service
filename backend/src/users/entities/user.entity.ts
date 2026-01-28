import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { WorkerProfile } from './worker-profile.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  WORKER = 'worker',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  phone: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  roles: UserRole[];

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 1 })
  status: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.00 })
  workerScore: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.00 })
  customerScore: number;

  @Column({ default: 0 })
  ratingCount: number;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  exp: number;

  @Column({ default: 0 })
  points: number; // 积分

  @Column({ name: 'invite_code', unique: true, nullable: true })
  inviteCode: string;

  @Column({ name: 'invited_by_id', nullable: true })
  invitedById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => WorkerProfile, (profile) => profile.user)
  profile: WorkerProfile;
}
