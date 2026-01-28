import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { WorkerProfile } from './entities/worker-profile.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, WorkerProfile])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
