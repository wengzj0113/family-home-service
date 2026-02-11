import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PointsRecordType {
  EARN = 'earn',
  SPEND = 'spend',
  ADJUST = 'adjust',
}

@Entity('points_records')
@Index(['userId'])
@Index(['type'])
export class PointsRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({
    type: 'enum',
    enum: PointsRecordType,
  })
  type: PointsRecordType;

  @Column({ type: 'int' })
  pointsChange: number;

  @Column({ type: 'int', default: 0 })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bizId: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
