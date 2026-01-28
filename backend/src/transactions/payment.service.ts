import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlipaySdk } from 'alipay-sdk';
const WxPay = require('wechatpay-node-v3');
import * as fs from 'fs';

@Injectable()
export class PaymentService {
  private alipaySdk: any;
  private wxPay: any;
  private readonly logger = new Logger(PaymentService.name);

  constructor(private configService: ConfigService) {
    this.initAlipay();
    this.initWxPay();
  }

  private initAlipay() {
    const appId = this.configService.get<string>('ALIPAY_APP_ID');
    const privateKey = this.configService.get<string>('ALIPAY_PRIVATE_KEY');
    const alipayPublicKey = this.configService.get<string>('ALIPAY_PUBLIC_KEY');
    const gateway = this.configService.get<string>('ALIPAY_GATEWAY');

    if (appId && privateKey && alipayPublicKey) {
      try {
        this.alipaySdk = new AlipaySdk({
          appId,
          privateKey,
          alipayPublicKey,
          gateway,
        });
        this.logger.log('Alipay SDK initialized');
      } catch (err) {
        this.logger.error('Alipay SDK initialization failed', err.message);
      }
    } else {
      this.logger.warn('Alipay configuration missing');
    }
  }

  private initWxPay() {
    const appid = this.configService.get<string>('WECHAT_APPID');
    const mchid = this.configService.get<string>('WECHAT_MCH_ID');
    const serial_no = this.configService.get<string>('WECHAT_SERIAL_NO');
    const apiV3Key = this.configService.get<string>('WECHAT_API_V3_KEY');
    const privateKeyContent = this.configService.get<string>('WECHAT_PRIVATE_KEY');
    const publicKeyContent = this.configService.get<string>('WECHAT_PUBLIC_KEY');

    if (appid && mchid && serial_no && apiV3Key && privateKeyContent && publicKeyContent) {
      try {
        this.wxPay = new WxPay({
          appid,
          mchid,
          publicKey: Buffer.from(publicKeyContent),
          serial_no,
          privateKey: Buffer.from(privateKeyContent),
          key: apiV3Key,
        });
        this.logger.log('WeChat Pay SDK initialized');
      } catch (err) {
        this.logger.error('WeChat Pay initialization failed', err.message);
      }
    } else {
      this.logger.warn('WeChat Pay configuration missing');
    }
  }

  /**
   * 创建支付宝网页支付单
   */
  async createAlipayWapOrder(orderNo: string, amount: number, subject: string) {
    if (!this.alipaySdk) throw new Error('支付宝未配置');

    try {
      const result = await this.alipaySdk.pageExecute('alipay.trade.wap.pay', {
        notifyUrl: this.configService.get<string>('ALIPAY_NOTIFY_URL'),
        returnUrl: 'http://localhost:3001/#/orders', // 支付成功后回跳地址
        bizContent: {
          outTradeNo: orderNo,
          totalAmount: amount.toFixed(2),
          subject,
          productCode: 'QUICK_WAP_WAY',
        },
      });
      return result; // 返回 HTML 表单
    } catch (err) {
      this.logger.error(`Alipay SDK Error: ${err.message}`);
      throw err;
    }
  }

  /**
   * 创建微信 JSAPI/小程序/H5 支付
   * 这里的示例为 H5 支付
   */
  async createWxH5Order(orderNo: string, amount: number, description: string, clientIp: string) {
    if (!this.wxPay) throw new Error('微信支付未配置');

    const params = {
      description,
      out_trade_no: orderNo,
      notify_url: this.configService.get<string>('WECHAT_NOTIFY_URL'),
      amount: {
        total: Math.round(amount * 100), // 微信单位为分
      },
      scene_info: {
        payer_client_ip: clientIp,
        h5_info: {
          type: 'Wap',
        },
      },
    };

    try {
      const result = await this.wxPay.transactions_h5(params);
      return result.h5_url; // 返回跳转支付的 URL
    } catch (err) {
      this.logger.error(`WeChat Pay SDK Error: ${err.message}`);
      throw err;
    }
  }

  /**
   * 验证支付宝回调签名
   */
  async verifyAlipayNotify(body: any): Promise<boolean> {
    if (!this.alipaySdk) return false;
    return this.alipaySdk.checkNotifySign(body);
  }

  /**
   * 验证微信支付回调
   */
  async verifyWxNotify(headers: any, body: any): Promise<any> {
    if (!this.wxPay) return null;
    try {
      // wechatpay-node-v3 会处理签名验证和解密
      const result = await this.wxPay.decipher_notifyv3(headers, body);
      return result;
    } catch (err) {
      this.logger.error('WeChat Pay Notify verify failed', err.message);
      return null;
    }
  }
}
