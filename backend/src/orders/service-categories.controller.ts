import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceCategory } from './entities/service-category.entity';

@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly categoriesService: ServiceCategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() data: Partial<ServiceCategory>) {
    // 实际应检查 admin 权限
    return this.categoriesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: Partial<ServiceCategory>) {
    // 实际应检查 admin 权限
    return this.categoriesService.update(+id, data);
  }
}
