import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AiSupportService } from './ai-support.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket])],
  providers: [SupportService, AiSupportService],
  controllers: [SupportController],
  exports: [SupportService, AiSupportService],
})
export class SupportModule {}
