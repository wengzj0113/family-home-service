import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { WorkerProfile } from './entities/worker-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(WorkerProfile)
    private workerProfileRepository: Repository<WorkerProfile>,
  ) {}

  async findOneByPhone(phone: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ 
      where: { phone },
      select: ['id', 'phone', 'password', 'roles', 'nickname', 'avatar', 'status', 'balance', 'createdAt', 'updatedAt']
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    if (!userData.roles || userData.roles.length === 0) {
      userData.roles = [UserRole.CUSTOMER];
    }
    
    // 生成唯一的邀请码 (6位大写字母+数字)
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const user = this.usersRepository.create({
      ...userData,
      inviteCode,
    });
    const savedUser = await this.usersRepository.save(user);
    
    if (savedUser.roles.includes(UserRole.WORKER)) {
      const profile = this.workerProfileRepository.create({ userId: savedUser.id });
      await this.workerProfileRepository.save(profile);
    }
    
    return savedUser;
  }

  async findByInviteCode(code: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { inviteCode: code } });
  }

  async updateProfile(userId: number, profileData: Partial<WorkerProfile>) {
    return this.workerProfileRepository.update({ userId }, profileData);
  }

  async findById(id: number): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ 
      where: { id }, 
      relations: ['profile'] 
    });
    if (user && typeof user.roles === 'string') {
      user.roles = (user.roles as string).split(',') as UserRole[];
    }
    return user;
  }

  async findAll(): Promise<User[]> {
    const users = await this.usersRepository.find({ relations: ['profile'] });
    return users.map(user => {
      if (user && typeof user.roles === 'string') {
        user.roles = (user.roles as string).split(',') as UserRole[];
      }
      return user;
    });
  }

  async updateStatus(id: number, status: number) {
    return this.usersRepository.update(id, { status });
  }

  async updateRoles(userId: number, roles: UserRole[]) {
    await this.usersRepository.update(userId, { roles });
    return this.findById(userId);
  }

  async updateLocation(userId: number, lat: number, lng: number) {
    return this.usersRepository.update(userId, { lat, lng });
  }
}
