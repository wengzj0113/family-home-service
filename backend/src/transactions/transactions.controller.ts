import { Controller, Get, Post, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentType } from './entities/payment.entity';

@Controller('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);
  constructor(
    private transactionsService: TransactionsService,
    private paymentService: PaymentService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyTransactions(@Request() req: any) {
    return this.transactionsService.findByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-payment')
  async createPayment(@Request() req: any, @Body() body: { orderId: number, method: 'alipay' | 'wechat' | 'mock' }) {
    const { orderId, method } = body;
    if (method === 'mock') {
      return { success: true, message: '模拟支付发起成功', type: 'mock' };
    }

    const userId = req.user?.id || req.user?.userId;
    const clientIp = (req.ip || '').replace('::ffff:', '') || '127.0.0.1';
    const payType = method === 'alipay' ? PaymentType.ALIPAY : PaymentType.WECHAT;
    const payment = await this.paymentService.createPayment(orderId, userId, payType, clientIp);
    return { success: true, data: payment, type: method };
  }

  @Post('alipay/notify')
  async handleAlipayNotify(@Body() body: any) {
    this.logger.log('Received Alipay Notify');
    return this.paymentService.handleAlipayNotify(body);
  }

  @Post('wechat/notify')
  async handleWxNotify(@Request() req: any, @Body() body: any) {
    this.logger.log('Received WeChat Pay Notify');
    return this.paymentService.handleWxNotify(req.headers, body);
  }

  @Post('alipay/notify-mock')
  async handleAlipayNotifyMock(@Body() body: { out_trade_no: string }) {
    // 仅供开发调试使用的模拟回调
    await this.transactionsService.handlePaymentSuccess(body.out_trade_no, 'MOCK_TRADE_NO');
    return { success: true };
  }
}
