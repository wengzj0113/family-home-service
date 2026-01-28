import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../users/entities/address.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async create(userId: number, addressData: Partial<Address>): Promise<Address> {
    if (addressData.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    const address = this.addressRepository.create({ ...addressData, userId });
    return this.addressRepository.save(address);
  }

  async findAll(userId: number): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number): Promise<Address> {
    const address = await this.addressRepository.findOne({ where: { id, userId } });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async update(userId: number, id: number, addressData: Partial<Address>): Promise<Address> {
    const address = await this.findOne(userId, id);
    if (addressData.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    Object.assign(address, addressData);
    return this.addressRepository.save(address);
  }

  async remove(userId: number, id: number): Promise<void> {
    const address = await this.findOne(userId, id);
    await this.addressRepository.remove(address);
  }

  async setDefault(userId: number, id: number): Promise<Address> {
    await this.addressRepository.update({ userId }, { isDefault: false });
    const address = await this.findOne(userId, id);
    address.isDefault = true;
    return this.addressRepository.save(address);
  }
}
