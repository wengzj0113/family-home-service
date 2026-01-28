import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { ServicePackage } from './entities/service-package.entity';
import { UserPackage } from './entities/user-package.entity';
import { OrdersService } from './orders.service';
import { ServiceCategoriesService } from './service-categories.service';
import { OrdersController } from './orders.controller';
import { ServiceCategoriesController } from './service-categories.controller';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Rating, ServiceCategory, ServicePackage, UserPackage]),
    UsersModule,
    TransactionsModule,
    NotificationsModule,
  ],
  providers: [OrdersService, ServiceCategoriesService],
  controllers: [OrdersController, ServiceCategoriesController],
  exports: [OrdersService, ServiceCategoriesService],
})
export class OrdersModule {}
