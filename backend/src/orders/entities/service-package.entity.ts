import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceCategory } from './service-category.entity';

@Entity('service_packages')
export class ServicePackage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // 如：保洁4次卡

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: 'category_id' })
  category: ServiceCategory;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column()
  times: number; // 总次数

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // 售价

  @Column({ name: 'expire_days' })
  expireDays: number; // 有效天数

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
