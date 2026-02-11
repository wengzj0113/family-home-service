import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('member_levels')
@Unique(['level'])
export class MemberLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  level: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'int', default: 0 })
  minExp: number;

  @Column({ type: 'int', default: 0 })
  minPoints: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  discountRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  workerCommissionRate: number;

  @Column({ type: 'tinyint', default: 1 })
  isActive: number;
}
