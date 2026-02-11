import { Controller, Get, Post, Param, UseGuards, Request, Patch, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationType } from './entities/notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(@Request() req: any) {
    return this.notificationsService.findAllByUser(req.user.userId);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Request() req: any, @Param('id') id: number) {
    await this.notificationsService.markAsRead(req.user.userId, id);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@Request() req: any) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { success: true };
  }

  @Get('preferences')
  async getPreferences(@Request() req: any) {
    return this.notificationsService.getPreference(req.user.userId);
  }

  @Patch('preferences')
  async updatePreferences(@Request() req: any, @Body() body: any) {
    return this.notificationsService.updatePreference(req.user.userId, body);
  }

  @Post('test-send')
  async testSend(
    @Request() req: any,
    @Body()
    body: {
      title?: string;
      content?: string;
      type?: NotificationType;
    },
  ) {
    return this.notificationsService.send(
      req.user.userId,
      body.title || '测试通知',
      body.content || '这是一条测试通知',
      {
        type: body.type || NotificationType.SYSTEM,
      },
    );
  }
}
