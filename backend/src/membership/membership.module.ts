import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { User } from '../users/entities/user.entity';
import { MemberLevel } from './entities/member-level.entity';
import { PointsRecord } from './entities/points-record.entity';
import { PointsMallItem } from './entities/points-mall-item.entity';
import { PointsExchange } from './entities/points-exchange.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, MemberLevel, PointsRecord, PointsMallItem, PointsExchange]),
  ],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
