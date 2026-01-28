import { Controller, Get, Post, Body, UseGuards, Request, Patch, Param, Delete } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('config')
export class ConfigController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly bannersService: BannersService,
  ) {}

  @Get('commission_rate')
  async getRate() {
    const rate = await this.transactionsService.getCommissionRate();
    return { value: rate };
  }

  @Post('commission_rate')
  @UseGuards(JwtAuthGuard)
  async setRate(@Request() req: any, @Body() body: { value: number }) {
    if (!req.user.roles.includes('admin')) {
      return { success: false, message: '权限不足' };
    }
    await this.transactionsService.setCommissionRate(body.value);
    return { success: true };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req: any) {
    if (!req.user.roles.includes('admin')) {
      return { success: false, message: '权限不足' };
    }
    return this.transactionsService.getPlatformStats();
  }

  // --- Banner Endpoints ---
  @Get('banners/active')
  getActiveBanners() {
    return this.bannersService.findActive();
  }

  @Get('banners/all')
  @UseGuards(JwtAuthGuard)
  async getAllBanners(@Request() req: any) {
    if (!req.user.roles.includes('admin')) return { success: false };
    return this.bannersService.findAll();
  }

  @Post('banners')
  @UseGuards(JwtAuthGuard)
  async createBanner(@Request() req: any, @Body() body: any) {
    if (!req.user.roles.includes('admin')) return { success: false };
    return this.bannersService.create(body);
  }

  @Patch('banners/:id')
  @UseGuards(JwtAuthGuard)
  async updateBanner(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    if (!req.user.roles.includes('admin')) return { success: false };
    return this.bannersService.update(+id, body);
  }

  @Delete('banners/:id')
  @UseGuards(JwtAuthGuard)
  async removeBanner(@Request() req: any, @Param('id') id: string) {
    if (!req.user.roles.includes('admin')) return { success: false };
    await this.bannersService.remove(+id);
    return { success: true };
  }
}
