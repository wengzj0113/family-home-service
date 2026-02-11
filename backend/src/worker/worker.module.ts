import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Settlement } from '../transactions/entities/settlement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, Settlement])],
  controllers: [WorkerController],
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}
