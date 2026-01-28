import { Controller, Get, Post, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
    const order = await this.transactionsService.getOrderById(orderId);
    if (!order) throw new Error('订单不存在');

    // 检查订单状态，如果是待抢单(0)或待出发(1)，可能是由于预支付逻辑（例如某些定金或先付后服模式）
    // 但按照当前逻辑，通常是服务完成后支付。这里我们允许 COMPLETED 状态
    
    if (method === 'mock') {
      return { success: true, message: '模拟支付发起成功', type: 'mock' };
    }

    if (method === 'alipay') {
      try {
        const form = await this.paymentService.createAlipayWapOrder(
          order.orderNo,
          order.amount,
          `好帮手家政-${order.serviceType}`,
        );
        return { success: true, data: form, type: 'alipay' };
      } catch (err) {
        this.logger.error('Alipay payment creation failed:', err.message);
        throw new Error('支付宝接口调用失败，请检查配置或稍后再试');
      }
    }

    if (method === 'wechat') {
      try {
        const clientIp = req.ip.replace('::ffff:', '') || '127.0.0.1';
        const url = await this.paymentService.createWxH5Order(
          order.orderNo,
          order.amount,
          `好帮手家政-${order.serviceType}`,
          clientIp,
        );
        return { success: true, data: url, type: 'wechat' };
      } catch (err) {
        this.logger.error('WeChat payment creation failed:', err.message);
        throw new Error('微信支付接口调用失败，请检查配置或稍后再试');
      }
    }

    throw new Error('暂不支持该支付方式');
  }

  @Post('alipay/notify')
  async handleAlipayNotify(@Body() body: any) {
    this.logger.log('Received Alipay Notify');
    const isValid = await this.paymentService.verifyAlipayNotify(body);
    if (!isValid) {
      this.logger.error('Alipay Notify verify failed');
      return 'fail';
    }

    if (body.trade_status === 'TRADE_SUCCESS' || body.trade_status === 'TRADE_FINISHED') {
      await this.transactionsService.handlePaymentSuccess(body.out_trade_no, body.trade_no);
    }
    return 'success';
  }

  @Post('wechat/notify')
  async handleWxNotify(@Request() req: any, @Body() body: any) {
    this.logger.log('Received WeChat Pay Notify');
    const result = await this.paymentService.verifyWxNotify(req.headers, body);
    
    if (result && (result.trade_state === 'SUCCESS' || result.trade_state === 'FINISHED')) {
      await this.transactionsService.handlePaymentSuccess(result.out_trade_no, result.transaction_id);
      return { code: 'SUCCESS', message: 'OK' };
    }
    
    return { code: 'FAIL', message: 'Verify failed' };
  }

  @Post('alipay/notify-mock')
  async handleAlipayNotifyMock(@Body() body: { out_trade_no: string }) {
    // 仅供开发调试使用的模拟回调
    await this.transactionsService.handlePaymentSuccess(body.out_trade_no, 'MOCK_TRADE_NO');
    return { success: true };
  }
}
