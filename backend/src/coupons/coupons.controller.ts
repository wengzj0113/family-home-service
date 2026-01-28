import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('active')
  findAllActive() {
    return this.couponsService.findAllActive();
  }

  @Post('claim')
  claimCoupon(@Request() req: any, @Body('couponId') couponId: number) {
    return this.couponsService.claimCoupon(req.user.userId, couponId);
  }

  @Get('my')
  findMyCoupons(@Request() req: any, @Query('status') status?: number) {
    return this.couponsService.findMyCoupons(req.user.userId, status !== undefined ? +status : undefined);
  }

  @Get('applicable')
  getApplicableCoupons(@Request() req: any, @Query('amount') amount: string) {
    return this.couponsService.getApplicableCoupons(req.user.userId, +amount);
  }
}
