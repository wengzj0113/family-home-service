import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('notification_preferences')
@Unique(['userId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'in_app_enabled', type: 'tinyint', default: 1 })
  inAppEnabled: number;

  @Column({ name: 'sms_enabled', type: 'tinyint', default: 0 })
  smsEnabled: number;

  @Column({ name: 'wechat_template_enabled', type: 'tinyint', default: 0 })
  wechatTemplateEnabled: number;

  @Column({ name: 'app_push_enabled', type: 'tinyint', default: 0 })
  appPushEnabled: number;

  @Column({ name: 'order_notice_enabled', type: 'tinyint', default: 1 })
  orderNoticeEnabled: number;

  @Column({ name: 'finance_notice_enabled', type: 'tinyint', default: 1 })
  financeNoticeEnabled: number;

  @Column({ name: 'system_notice_enabled', type: 'tinyint', default: 1 })
  systemNoticeEnabled: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
