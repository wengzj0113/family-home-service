import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
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
}
