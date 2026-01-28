import { Controller, Post, Body, Get, UseGuards, Request, Param } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    return this.ratingsService.create(req.user.userId, body);
  }

  @Get('user/:id')
  async getByUserId(@Param('id') id: number) {
    return this.ratingsService.findByToUser(id);
  }

  @Get('worker/:id')
  async getWorkerDetail(@Param('id') id: number) {
    const detail = await this.ratingsService.getWorkerSummary(id);
    if (!detail) return { success: false, message: '未找到该师傅信息' };
    return { success: true, data: detail };
  }
}
