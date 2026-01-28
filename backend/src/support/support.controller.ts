import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportTicket, TicketStatus } from './entities/support-ticket.entity';
import { AiSupportService } from './ai-support.service';

@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly aiSupportService: AiSupportService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('tickets')
  create(@Request() req: any, @Body() data: Partial<SupportTicket>) {
    return this.supportService.create(req.user.userId, data);
  }

  @Post('ai-chat')
  aiChat(
    @Request() req: any,
    @Body() body: { message: string; orderId?: number; category?: string },
  ) {
    const userId = req.user?.userId || 0; // 即使未登录也允许访问
    return this.aiSupportService.generateReply(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-tickets')
  findMy(@Request() req: any) {
    return this.supportService.findAllByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  findAllAdmin(@Request() req: any) {
    if (!req.user.roles.includes('admin')) throw new ForbiddenException('权限不足');
    return this.supportService.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/tickets/:id')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: number, adminReply?: string }
  ) {
    if (!req.user.roles.includes('admin')) throw new ForbiddenException('权限不足');
    return this.supportService.updateStatus(+id, body.status as TicketStatus, body.adminReply);
  }
}
