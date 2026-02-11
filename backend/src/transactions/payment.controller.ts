import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentType } from './entities/payment.entity';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 创建支付单
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req,
    @Body() body: { orderId: number; payType: PaymentType; clientIp?: string },
  ) {
    return this.paymentService.createPayment(
      body.orderId,
      req.user.id,
      body.payType,
      body.clientIp,
    );
  }

  /**
   * 申请退款
   */
  @Post('refund')
  @UseGuards(JwtAuthGuard)
  async applyRefund(@Req() req, @Body() body: { orderId: number; reason: string }) {
    return this.paymentService.applyRefund(req.user.id, body.orderId, body.reason);
  }

  /**
   * 支付宝回调
   */
  @Post('alipay/notify')
  @HttpCode(200)
  async alipayNotify(@Body() body: any) {
    return this.paymentService.handleAlipayNotify(body);
  }

  /**
   * 微信支付回调
   */
  @Post('wechat/notify')
  @HttpCode(200)
  async wechatNotify(@Headers() headers: any, @Body() body: any) {
    return this.paymentService.handleWxNotify(headers, body);
  }
}
