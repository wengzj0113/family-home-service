import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // 如：日常保洁

  @Column({ nullable: true })
  icon: string; // RemixIcon 类名

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number; // 起步价 / 单价

  @Column()
  unit: string; // 计费单位，如：小时、台、平米

  @Column({ type: 'text', nullable: true })
  description: string; // 服务描述

  @Column({ type: 'text', nullable: true })
  checklist: string; // 服务规范/标准清单，逗号或换行分隔

  @Column({ type: 'text', nullable: true })
  exclusions: string; // 不包含内容，逗号或换行分隔

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
