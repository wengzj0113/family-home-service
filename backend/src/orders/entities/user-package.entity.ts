import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ServicePackage } from './service-package.entity';

@Entity('user_packages')
export class UserPackage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => ServicePackage)
  @JoinColumn({ name: 'package_id' })
  package: ServicePackage;

  @Column({ name: 'package_id' })
  packageId: number;

  @Column({ name: 'remaining_times' })
  remainingTimes: number;

  @Column({ name: 'expire_at' })
  expireAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
