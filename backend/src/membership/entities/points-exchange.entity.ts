import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum PointsExchangeStatus {
  CREATED = 'created',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('points_exchanges')
@Index(['userId'])
@Index(['itemId'])
export class PointsExchange {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  itemId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int' })
  totalPoints: number;

  @Column({
    type: 'enum',
    enum: PointsExchangeStatus,
    default: PointsExchangeStatus.CREATED,
  })
  status: PointsExchangeStatus;

  @Column({ type: 'varchar', length: 100, unique: true })
  exchangeNo: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
