import { Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkerService } from './worker.service';

@Controller('worker')
@UseGuards(JwtAuthGuard)
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Patch('me/online-status')
  async setOnlineStatus(
    @Req() req: any,
    @Body() body: { online: boolean; lat?: number; lng?: number },
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.workerService.setOnlineStatus(userId, !!body.online, body.lat, body.lng);
  }

  @Get('me/income-summary')
  async getIncomeSummary(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.workerService.getIncomeSummary(userId);
  }

  @Get('me/income-details')
  async getIncomeDetails(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.workerService.getIncomeDetails(userId, Number(page), Number(pageSize));
  }
}
