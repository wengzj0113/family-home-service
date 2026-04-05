import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { OrdersModule } from '../src/orders/orders.module';
import { TransactionsModule } from '../src/transactions/transactions.module';
import { RatingsModule } from '../src/ratings/ratings.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { AddressesModule } from '../src/addresses/addresses.module';
import { ChatModule } from '../src/chat/chat.module';
import { CouponsModule } from '../src/coupons/coupons.module';
import { SupportModule } from '../src/support/support.module';
import { FilesModule } from '../src/files/files.module';
import { AnalyticsModule } from '../src/analytics/analytics.module';
import { MembershipModule } from '../src/membership/membership.module';
import { WorkerModule } from '../src/worker/worker.module';
import { AdminModule } from '../src/admin/admin.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RateLimitMiddleware } from '../src/common/middleware/rate-limit.middleware';
import { SystemController } from '../src/system.controller';

function buildTypeOrmConfig(): TypeOrmModuleOptions {
  const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();

  if (dbType === 'sqljs') {
    return {
      type: 'sqljs',
      autoSave: true,
      location: process.env.DB_NAME || 'data.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    };
  }

  if (dbType === 'postgres') {
    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true' && process.env.NODE_ENV !== 'production',
      ssl:
        process.env.DB_SSL === 'true'
          ? {
              rejectUnauthorized: false,
            }
          : false,
    };
  }

  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'family_home_service',
    autoLoadEntities: true,
    synchronize: process.env.DB_SYNCHRONIZE === 'true' && process.env.NODE_ENV !== 'production',
  };
}

@Module({
  controllers: [SystemController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRoot(buildTypeOrmConfig()),
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
export class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        console.log(`[Request] ${req.method} ${req.url}`);
        next();
      }, RateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
