import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { ServicePackage } from './entities/service-package.entity';

@Injectable()
export class ServiceCategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(ServiceCategory)
    private readonly categoryRepository: Repository<ServiceCategory>,
    @InjectRepository(ServicePackage)
    private readonly packageRepository: Repository<ServicePackage>,
  ) {}

  async onModuleInit() {
    const count = await this.categoryRepository.count();
    if (count === 0) {
      // ... categories ...
    }

    const pkgCount = await this.packageRepository.count();
    if (pkgCount === 0) {
      const categories = await this.categoryRepository.find();
      const bj = categories.find(c => c.name === '日常保洁');
      if (bj) {
        await this.packageRepository.save([
          { name: '日常保洁4次卡', categoryId: bj.id, times: 4, price: 160, expireDays: 90, description: '单次仅需40元，有效期90天' },
          { name: '日常保洁10次卡', categoryId: bj.id, times: 10, price: 350, expireDays: 180, description: '单次仅需35元，有效期180天' },
        ]);
      }
    }
  }

  async findAll(): Promise<ServiceCategory[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ServiceCategory> {
    return this.categoryRepository.findOne({ where: { id } });
  }

  async create(data: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const category = this.categoryRepository.create(data);
    return this.categoryRepository.save(category);
  }

  async update(id: number, data: Partial<ServiceCategory>): Promise<ServiceCategory> {
    await this.categoryRepository.update(id, data);
    return this.findOne(id);
  }
}
