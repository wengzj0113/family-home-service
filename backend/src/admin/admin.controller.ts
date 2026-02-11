import { Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { PaymentStatus } from '../transactions/entities/payment.entity';
import { RefundStatus } from '../transactions/entities/refund.entity';
import { WithdrawalStatus } from '../transactions/entities/withdrawal.entity';
import { TicketStatus } from '../support/entities/support-ticket.entity';
import { PaymentService } from '../transactions/payment.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentService: PaymentService,
  ) {}

  @Get('dashboard/overview')
  async getOverview(@Req() req: any) {
    this.ensureAdmin(req);
    return this.adminService.getDashboardOverview();
  }

  @Get('users')
  async listUsers(@Req() req: any, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    this.ensureAdmin(req);
    return this.adminService.listUsers(Number(page), Number(pageSize));
  }

  @Get('orders')
  async listOrders(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
  ) {
    this.ensureAdmin(req);
    const parsed = status !== undefined ? (Number(status) as OrderStatus) : undefined;
    return this.adminService.listOrders(Number(page), Number(pageSize), parsed);
  }

  @Get('finance/payments')
  async listPayments(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
  ) {
    this.ensureAdmin(req);
    const parsed = status as PaymentStatus | undefined;
    return this.adminService.listPayments(Number(page), Number(pageSize), parsed);
  }

  @Get('finance/refunds')
  async listRefunds(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
  ) {
    this.ensureAdmin(req);
    const parsed = status as RefundStatus | undefined;
    return this.adminService.listRefunds(Number(page), Number(pageSize), parsed);
  }

  @Get('finance/withdrawals')
  async listWithdrawals(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
  ) {
    this.ensureAdmin(req);
    const parsed = status !== undefined ? (Number(status) as WithdrawalStatus) : undefined;
    return this.adminService.listWithdrawals(Number(page), Number(pageSize), parsed);
  }

  @Get('support/tickets')
  async listTickets(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
  ) {
    this.ensureAdmin(req);
    const parsed = status !== undefined ? (Number(status) as TicketStatus) : undefined;
    return this.adminService.listTickets(Number(page), Number(pageSize), parsed);
  }

  @Post('finance/refunds/:id/approve')
  async approveRefund(@Req() req: any, @Param('id') id: string) {
    this.ensureAdmin(req);
    const auditorId = Number(req.user?.userId || req.user?.id || 0);
    return this.paymentService.executeRefund(Number(id), auditorId);
  }

  private ensureAdmin(req: any) {
    if (!req.user?.roles?.includes('admin')) throw new ForbiddenException('权限不足');
  }
}
