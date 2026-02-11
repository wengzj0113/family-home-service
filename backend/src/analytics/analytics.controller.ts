import { Controller, Get, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { UseInterceptors } from '@nestjs/common';
import { Cacheable } from '../common/decorators/cacheable.decorator';
import { SimpleCacheInterceptor } from '../common/interceptors/simple-cache.interceptor';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin/overview')
  @UseInterceptors(SimpleCacheInterceptor)
  @Cacheable(20)
  async getOverview(
    @Req() req,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
  ) {
    this.ensureAdmin(req);

    const hasRange = !!startAt && !!endAt;
    const range = hasRange
      ? {
          startAt: new Date(startAt as string),
          endAt: new Date(endAt as string),
        }
      : undefined;

    return {
      success: true,
      data: await this.analyticsService.getOverview(range),
    };
  }

  @Get('admin/order-trend')
  @UseInterceptors(SimpleCacheInterceptor)
  @Cacheable(20)
  async getOrderTrend(@Req() req, @Query('days') days = '7') {
    this.ensureAdmin(req);

    return {
      success: true,
      data: await this.analyticsService.getOrderTrend(Number(days) || 7),
    };
  }

  @Get('admin/finance-trend')
  @UseInterceptors(SimpleCacheInterceptor)
  @Cacheable(20)
  async getFinanceTrend(@Req() req, @Query('days') days = '7') {
    this.ensureAdmin(req);

    return {
      success: true,
      data: await this.analyticsService.getFinanceTrend(Number(days) || 7),
    };
  }

  @Get('admin/refund-summary')
  @UseInterceptors(SimpleCacheInterceptor)
  @Cacheable(20)
  async getRefundSummary(
    @Req() req,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
  ) {
    this.ensureAdmin(req);
    return {
      success: true,
      data: await this.analyticsService.getRefundSummary(this.buildRange(startAt, endAt)),
    };
  }

  @Get('admin/worker-income-top')
  @UseInterceptors(SimpleCacheInterceptor)
  @Cacheable(20)
  async getWorkerIncomeTop(
    @Req() req,
    @Query('days') days = '30',
    @Query('limit') limit = '10',
  ) {
    this.ensureAdmin(req);
    return {
      success: true,
      data: await this.analyticsService.getWorkerIncomeTop(Number(days) || 30, Number(limit) || 10),
    };
  }

  @Get('admin/export/overview')
  async exportOverviewCsv(
    @Req() req,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
  ) {
    this.ensureAdmin(req);
    const csv = await this.analyticsService.exportOverviewCsv(this.buildRange(startAt, endAt));
    return {
      success: true,
      data: csv,
      filename: `analytics_overview_${Date.now()}.csv`,
    };
  }

  private ensureAdmin(req: any) {
    if (!req.user?.roles?.includes('admin')) {
      throw new ForbiddenException('权限不足');
    }
  }

  private buildRange(startAt?: string, endAt?: string) {
    if (!startAt || !endAt) return undefined;
    return {
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    };
  }
}
