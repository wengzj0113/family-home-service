import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
  ) {}

  async getChatHistory(userId: number, contactId: number) {
    return this.messageRepository.find({
      where: [
        { senderId: userId, receiverId: contactId },
        { senderId: contactId, receiverId: userId },
      ],
      order: { createdAt: 'ASC' },
      relations: ['sender'],
    });
  }

  async getRecentContacts(userId: number) {
    // 简单逻辑：获取最近发过消息的人
    const messages = await this.messageRepository
      .createQueryBuilder('m')
      .where('m.sender_id = :userId OR m.receiver_id = :userId', { userId })
      .leftJoinAndSelect('m.sender', 'sender')
      .leftJoinAndSelect('m.receiver', 'receiver')
      .orderBy('m.created_at', 'DESC')
      .getMany();

    const contacts = new Map();
    messages.forEach(m => {
      const contact = m.senderId === userId ? m.receiver : m.sender;
      if (!contacts.has(contact.id)) {
        contacts.set(contact.id, {
          ...contact,
          lastMessage: m.content,
          lastTime: m.createdAt,
        });
      }
    });

    return Array.from(contacts.values());
  }
}
