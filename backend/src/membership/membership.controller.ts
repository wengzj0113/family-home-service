import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembershipService } from './membership.service';
import { PointsRecordType } from './entities/points-record.entity';

@Controller('membership')
@UseGuards(JwtAuthGuard)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('me')
  async getMyProfile(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.membershipService.getMyProfile(userId);
  }

  @Get('me/points-records')
  async getMyPointsRecords(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.membershipService.getMyPointsRecords(userId, Number(page), Number(pageSize));
  }

  @Get('levels')
  async getLevels() {
    return this.membershipService.listLevels();
  }

  @Get('mall/items')
  async getMallItems(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.membershipService.listMallItems(Number(page), Number(pageSize));
  }

  @Post('mall/exchange')
  async exchangeItem(@Req() req: any, @Body() body: { itemId: number; quantity?: number }) {
    const userId = req.user?.id || req.user?.userId;
    return this.membershipService.exchangeItem(userId, body.itemId, body.quantity || 1);
  }

  @Post('admin/levels/upsert')
  async upsertLevel(@Req() req: any, @Body() body: any) {
    this.ensureAdmin(req);
    return this.membershipService.upsertLevel(body);
  }

  @Post('admin/points/adjust')
  async adjustPoints(
    @Req() req: any,
    @Body()
    body: {
      userId: number;
      pointsDelta: number;
      type?: PointsRecordType;
      source?: string;
      remark?: string;
    },
  ) {
    this.ensureAdmin(req);
    return this.membershipService.adjustUserPoints(
      body.userId,
      body.pointsDelta,
      body.type || PointsRecordType.ADJUST,
      body.source || 'admin_adjust',
      body.remark,
    );
  }

  @Post('admin/mall/items')
  async createMallItem(@Req() req: any, @Body() body: any) {
    this.ensureAdmin(req);
    return this.membershipService.createMallItem(body);
  }

  private ensureAdmin(req: any) {
    if (!req.user?.roles?.includes('admin')) {
      throw new ForbiddenException('权限不足');
    }
  }
}
