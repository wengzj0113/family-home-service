import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, string>();

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const tokenRaw =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string) ||
      '';
    const token = tokenRaw.startsWith('Bearer ') ? tokenRaw.slice(7) : tokenRaw;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'dev-secret',
      });
      client.data.userId = Number(payload.sub);
      this.userSockets.set(client.data.userId, client.id);
      console.log(`User ${client.data.userId} connected`);
    } catch (error) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: number; content: string; orderId?: number },
  ) {
    const senderId = Number(client.data.userId);
    if (!senderId) return;

    const message = this.messageRepository.create({
      senderId,
      receiverId: data.receiverId,
      content: data.content,
      orderId: data.orderId,
    });

    const savedMessage = await this.messageRepository.save(message);

    // 发送给接收者（如果在线）
    const receiverSocketId = this.userSockets.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('newMessage', savedMessage);
    }

    // 发送回发送者确认
    client.emit('messageSent', savedMessage);
  }
}
