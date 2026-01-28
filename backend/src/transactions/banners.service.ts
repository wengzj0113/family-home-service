import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';

@Injectable()
export class BannersService implements OnModuleInit {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
  ) {}

  async onModuleInit() {
    const count = await this.bannerRepository.count();
    if (count === 0) {
      await this.bannerRepository.save([
        { title: '新人大礼包', imageUrl: 'https://img.js.design/assets/img/6560690769ca00be99066666.png', isActive: true, sortOrder: 1 },
        { title: '深度保洁专项', imageUrl: 'https://img.js.design/assets/img/6560690a69ca00be99066667.png', isActive: true, sortOrder: 2 },
      ]);
    }
  }

  async findAll() {
    return this.bannerRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async findActive() {
    return this.bannerRepository.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
  }

  async create(data: Partial<Banner>) {
    const banner = this.bannerRepository.create(data);
    return this.bannerRepository.save(banner);
  }

  async update(id: number, data: Partial<Banner>) {
    await this.bannerRepository.update(id, data);
    return this.bannerRepository.findOne({ where: { id } });
  }

  async remove(id: number) {
    await this.bannerRepository.delete(id);
  }
}
