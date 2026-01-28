import { Controller, Post, Body, Get, UseGuards, Request, Param, Patch, ForbiddenException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WithdrawalStatus } from './entities/withdrawal.entity';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
export class WithdrawalsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    return this.transactionsService.createWithdrawal(req.user.userId, body);
  }

  @Get('admin/all')
  async getAllForAdmin(@Request() req: any) {
    if (!req.user.roles.includes('admin')) {
      throw new ForbiddenException('权限不足');
    }
    return this.transactionsService.findAllWithdrawals();
  }

  @Patch(':id/audit')
  async audit(@Request() req: any, @Param('id') id: number, @Body() body: { status: number, remark?: string }) {
    if (!req.user.roles.includes('admin')) {
      throw new ForbiddenException('权限不足');
    }
    return this.transactionsService.auditWithdrawal(id, body.status as WithdrawalStatus, body.remark);
  }
}
