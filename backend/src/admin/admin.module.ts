import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../transactions/entities/payment.entity';
import { Refund } from '../transactions/entities/refund.entity';
import { Withdrawal } from '../transactions/entities/withdrawal.entity';
import { SupportTicket } from '../support/entities/support-ticket.entity';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Order, Payment, Refund, Withdrawal, SupportTicket]),
    TransactionsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
