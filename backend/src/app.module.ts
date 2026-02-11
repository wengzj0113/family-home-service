import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { TransactionsModule } from './transactions/transactions.module';
import { RatingsModule } from './ratings/ratings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AddressesModule } from './addresses/addresses.module';
import { ChatModule } from './chat/chat.module';
import { CouponsModule } from './coupons/coupons.module';
import { SupportModule } from './support/support.module';
import { FilesModule } from './files/files.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MembershipModule } from './membership/membership.module';
import { WorkerModule } from './worker/worker.module';
import { AdminModule } from './admin/admin.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { SystemController } from './system.controller';

@Module({
  controllers: [SystemController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'password',
      database: process.env.DB_NAME || 'family_home_service',
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true' && process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UsersModule,
    OrdersModule,
    TransactionsModule,
    RatingsModule,
    NotificationsModule,
    AddressesModule,
    ChatModule,
    CouponsModule,
    SupportModule,
    FilesModule,
    AnalyticsModule,
    MembershipModule,
    WorkerModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        console.log(`[Request] ${req.method} ${req.url}`);
        next();
      }, RateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
