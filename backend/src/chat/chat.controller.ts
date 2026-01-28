import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history/:contactId')
  getChatHistory(@Request() req: any, @Param('contactId') contactId: string) {
    return this.chatService.getChatHistory(req.user.userId, +contactId);
  }

  @Get('contacts')
  getRecentContacts(@Request() req: any) {
    return this.chatService.getRecentContacts(req.user.userId);
  }
}
