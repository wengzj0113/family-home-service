import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(phone: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByPhone(phone);
    if (user && user.password === pass) { // In production, use bcrypt
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, phone: user.phone, roles: user.roles };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(phone: string, password: string, roles: UserRole[], inviteCode?: string) {
    const existingUser = await this.usersService.findOneByPhone(phone);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    let invitedById = null;
    if (inviteCode) {
      const inviter = await this.usersService.findByInviteCode(inviteCode.toUpperCase());
      if (inviter) invitedById = inviter.id;
    }

    const user = await this.usersService.create({ phone, password, roles, invitedById });
    return this.login(user);
  }
}
