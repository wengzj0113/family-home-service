import { Controller, Post, Body, Get, UseGuards, Request, Param, Patch, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderStatus } from './entities/order.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    return this.ordersService.create(req.user.userId, body);
  }

  @Get('pending')
  async getPending(@Request() req: any) {
    return this.ordersService.findAllPending(req.query);
  }

  @Get('my')
  async getMyOrders(@Request() req: any) {
    return this.ordersService.findByUser(req.user.userId, req.user.roles);
  }

  @Post(':id/grab')
  async grab(@Request() req: any, @Param('id') id: number) {
    if (!req.user.roles.includes('worker')) {
      throw new ForbiddenException('只有服务人员身份可以抢单');
    }
    return this.ordersService.grabOrder(id, req.user.userId);
  }

  @Patch(':id/depart')
  async depart(@Request() req: any, @Param('id') id: number) {
    return this.ordersService.depart(id, req.user.userId);
  }

  @Patch(':id/arrive')
  async arrive(@Request() req: any, @Param('id') id: number, @Body() body: { lat?: number, lng?: number }) {
    return this.ordersService.arrive(id, req.user.userId, body.lat, body.lng);
  }

  @Patch(':id/start')
  async startService(@Request() req: any, @Param('id') id: number) {
    return this.ordersService.startService(id, req.user.userId);
  }

  @Patch(':id/complete')
  async complete(@Request() req: any, @Param('id') id: number, @Body() body: { score?: number, content?: string }) {
    return this.ordersService.completeOrder(id, req.user.userId, body);
  }

  @Patch(':id/items')
  async updateItems(@Request() req: any, @Param('id') id: number, @Body() body: { completedItems: string }) {
    return this.ordersService.updateCompletedItems(id, req.user.userId, body.completedItems);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  async getAllOrders(@Request() req: any) {
    if (!req.user.roles.includes('admin')) {
      throw new ForbiddenException('权限不足');
    }
    return this.ordersService.findAllAdmin();
  }

  @Get(':id/track')
  async track(@Request() req: any, @Param('id') id: number) {
    return this.ordersService.trackOrder(id, req.user.userId);
  }
}
