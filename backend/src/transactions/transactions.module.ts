import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { PlatformConfig } from './entities/platform-config.entity';
import { Withdrawal } from './entities/withdrawal.entity';
import { Banner } from './entities/banner.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { Settlement } from './entities/settlement.entity';
import { TransactionsService } from './transactions.service';
import { PaymentService } from './payment.service';
import { BannersService } from './banners.service';
import { ConfigController } from './config.controller';
import { TransactionsController } from './transactions.controller';
import { WithdrawalsController } from './withdrawals.controller';
import { PaymentController } from './payment.controller';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      PlatformConfig,
      Withdrawal,
      Banner,
      Payment,
      Refund,
      Settlement,
      User,
      Order,
    ]),
    NotificationsModule,
  ],
  controllers: [ConfigController, TransactionsController, WithdrawalsController, PaymentController],
  providers: [TransactionsService, PaymentService, BannersService],
  exports: [TransactionsService, PaymentService, BannersService],
})
export class TransactionsModule {}
