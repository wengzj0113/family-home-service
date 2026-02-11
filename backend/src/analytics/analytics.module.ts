import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Payment } from '../transactions/entities/payment.entity';
import { Refund } from '../transactions/entities/refund.entity';
import { Settlement } from '../transactions/entities/settlement.entity';
import { SimpleCacheService } from '../common/services/simple-cache.service';
import { SimpleCacheInterceptor } from '../common/interceptors/simple-cache.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order, Transaction, Payment, Refund, Settlement])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, SimpleCacheService, SimpleCacheInterceptor],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
