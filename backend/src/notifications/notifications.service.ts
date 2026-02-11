import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

export enum NotifyChannel {
  IN_APP = 'in_app',
  SMS = 'sms',
  WECHAT_TEMPLATE = 'wechat_template',
  APP_PUSH = 'app_push',
}

type SendOptions = {
  type?: NotificationType;
  channels?: NotifyChannel[];
  metadata?: Record<string, any>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferencesRepository: Repository<NotificationPreference>,
  ) {}

  async create(userId: number, title: string, content: string, type: NotificationType = NotificationType.SYSTEM) {
    const notification = this.notificationsRepository.create({
      userId,
      title,
      content,
      type,
    });
    return this.notificationsRepository.save(notification);
  }

  /**
   * 统一通知发送入口：
   * - 默认根据用户偏好决定发送通道
   * - 默认始终尝试写入站内消息（若用户关闭站内则跳过）
   */
  async send(userId: number, title: string, content: string, options?: SendOptions) {
    const type = options?.type || NotificationType.SYSTEM;
    const preference = await this.getPreference(userId);
    const channels = options?.channels?.length
      ? options.channels
      : this.resolveChannelsByPreference(preference, type);

    const results: Array<{ channel: NotifyChannel; success: boolean; messageId?: string }> = [];

    for (const channel of channels) {
      if (channel === NotifyChannel.IN_APP) {
        const record = await this.create(userId, title, content, type);
        results.push({ channel, success: true, messageId: String(record.id) });
      } else if (channel === NotifyChannel.SMS) {
        const messageId = await this.sendSms(userId, title, content, options?.metadata);
        results.push({ channel, success: true, messageId });
      } else if (channel === NotifyChannel.WECHAT_TEMPLATE) {
        const messageId = await this.sendWechatTemplate(userId, title, content, options?.metadata);
        results.push({ channel, success: true, messageId });
      } else if (channel === NotifyChannel.APP_PUSH) {
        const messageId = await this.sendAppPush(userId, title, content, options?.metadata);
        results.push({ channel, success: true, messageId });
      }
    }

    return {
      success: true,
      channels,
      results,
    };
  }

  async findAllByUser(userId: number) {
    return this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(userId: number, id: number) {
    return this.notificationsRepository.update({ id, userId }, { isRead: true });
  }

  async markAllAsRead(userId: number) {
    return this.notificationsRepository.update({ userId, isRead: false }, { isRead: true });
  }

  async getUnreadCount(userId: number) {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }

  async getPreference(userId: number) {
    let preference = await this.preferencesRepository.findOne({ where: { userId } });
    if (!preference) {
      preference = this.preferencesRepository.create({
        userId,
        inAppEnabled: 1,
        smsEnabled: 0,
        wechatTemplateEnabled: 0,
        appPushEnabled: 0,
        orderNoticeEnabled: 1,
        financeNoticeEnabled: 1,
        systemNoticeEnabled: 1,
      });
      preference = await this.preferencesRepository.save(preference);
    }
    return preference;
  }

  async updatePreference(userId: number, payload: Partial<NotificationPreference>) {
    const current = await this.getPreference(userId);
    const merged = this.preferencesRepository.merge(current, payload);
    return this.preferencesRepository.save(merged);
  }

  private resolveChannelsByPreference(
    preference: NotificationPreference,
    type: NotificationType,
  ): NotifyChannel[] {
    const byTypeEnabled =
      type === NotificationType.ORDER
        ? preference.orderNoticeEnabled
        : type === NotificationType.FINANCE
          ? preference.financeNoticeEnabled
          : preference.systemNoticeEnabled;

    if (!byTypeEnabled) return [];

    const channels: NotifyChannel[] = [];
    if (preference.inAppEnabled) channels.push(NotifyChannel.IN_APP);
    if (preference.smsEnabled) channels.push(NotifyChannel.SMS);
    if (preference.wechatTemplateEnabled) channels.push(NotifyChannel.WECHAT_TEMPLATE);
    if (preference.appPushEnabled) channels.push(NotifyChannel.APP_PUSH);
    return channels;
  }

  // 下面三个通道先留统一接口，当前阶段走日志模拟，便于后续接入真实 SDK
  private async sendSms(
    userId: number,
    title: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const messageId = `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.log(
      `[SMS] user=${userId} title=${title} content=${content} meta=${JSON.stringify(metadata || {})}`,
    );
    return messageId;
  }

  private async sendWechatTemplate(
    userId: number,
    title: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const messageId = `wx_tpl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.log(
      `[WX_TEMPLATE] user=${userId} title=${title} content=${content} meta=${JSON.stringify(
        metadata || {},
      )}`,
    );
    return messageId;
  }

  private async sendAppPush(
    userId: number,
    title: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const messageId = `app_push_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.log(
      `[APP_PUSH] user=${userId} title=${title} content=${content} meta=${JSON.stringify(
        metadata || {},
      )}`,
    );
    return messageId;
  }
}
