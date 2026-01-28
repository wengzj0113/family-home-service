import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus } from './entities/support-ticket.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepository: Repository<SupportTicket>,
  ) {}

  async create(userId: number, data: Partial<SupportTicket>): Promise<SupportTicket> {
    const ticket = this.ticketRepository.create({ ...data, userId });
    return this.ticketRepository.save(ticket);
  }

  async findAllByUser(userId: number): Promise<SupportTicket[]> {
    return this.ticketRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllAdmin(): Promise<SupportTicket[]> {
    return this.ticketRepository.find({
      relations: ['user', 'order'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: number, status: TicketStatus, adminReply?: string): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    
    ticket.status = status;
    if (adminReply) ticket.adminReply = adminReply;
    
    return this.ticketRepository.save(ticket);
  }
}
