import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Address } from '../users/entities/address.entity';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  create(@Request() req: any, @Body() addressData: Partial<Address>) {
    return this.addressesService.create(req.user.userId, addressData);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.addressesService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.addressesService.findOne(req.user.userId, +id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() addressData: Partial<Address>) {
    return this.addressesService.update(req.user.userId, +id, addressData);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.addressesService.remove(req.user.userId, +id);
  }

  @Patch(':id/default')
  setDefault(@Request() req: any, @Param('id') id: string) {
    return this.addressesService.setDefault(req.user.userId, +id);
  }
}
