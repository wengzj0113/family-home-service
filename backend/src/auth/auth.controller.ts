import { Controller, Post, Body, UseGuards, Request, Get, Patch, Param, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../users/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    const roles = Array.isArray(body.roles) ? body.roles : [body.role || UserRole.CUSTOMER];
    return this.authService.register(body.phone, body.password, roles, body.inviteCode);
  }

  @Post('login')
  async login(@Body() body: any) {
    let user;
    if (body.type === 'sms') {
      // 验证码登录逻辑 (演示环境：验证码固定为 123456)
      if (body.code !== '123456') {
        return { success: false, message: '验证码错误' };
      }
      user = await this.usersService.findOneByPhone(body.phone);
      if (!user) {
        return { success: false, message: '用户不存在，请先注册' };
      }
    } else {
      // 密码登录
      user = await this.authService.validateUser(body.phone, body.password);
      if (!user) {
        return { success: false, message: '手机号或密码错误' };
      }
    }
    return this.authService.login(user);
  }

  @Post('send-code')
  async sendCode(@Body() body: any) {
    // 模拟发送验证码
    console.log(`[SMS] Sending code 123456 to ${body.phone}`);
    return { success: true, message: '验证码已发送（演示环境：123456）' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('worker/verify')
  async verifyWorker(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    await this.usersService.updateProfile(userId, {
      realName: body.realName,
      idCardNo: body.idCardNo,
      skills: Array.isArray(body.skills) ? body.skills.join(',') : body.skills,
      experience: body.experience ? Number(body.experience) : 0,
      introduction: body.introduction,
      idCardFront: body.idCardFront || 'mock_url',
      idCardBack: body.idCardBack || 'mock_url',
      idCardHand: body.idCardHand || 'mock_url',
      healthCertificate: body.healthCertificate || 'mock_url',
      auditStatus: 1, // Submitted for review
    });
    return { success: true, message: '认证资料已提交，请等待审核' };
  }

  // 演示用途：模拟管理员审批
  @UseGuards(JwtAuthGuard)
  @Post('worker/approve-mock')
  async approveWorker(@Request() req) {
    await this.usersService.updateProfile(req.user.userId, {
      auditStatus: 2, // Approved
    });
    return { success: true, message: '认证已模拟通过' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async getAllUsers(@Request() req) {
    if (!req.user.roles.includes('admin')) {
      return { success: false, message: '权限不足' };
    }
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/:id/status')
  async updateUserStatus(@Request() req, @Param('id') id: number, @Body() body: { status: number }) {
    if (!req.user.roles.includes('admin')) {
      return { success: false, message: '权限不足' };
    }
    await this.usersService.updateStatus(id, body.status);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('worker/:id/audit')
  async auditWorker(@Request() req, @Param('id') id: number, @Body() body: { status: number }) {
    if (!req.user.roles.includes('admin')) {
      return { success: false, message: '权限不足' };
    }
    await this.usersService.updateProfile(id, { auditStatus: body.status });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('roles')
  async updateRoles(@Request() req, @Body() body: any) {
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return { success: false, message: '请至少选择一个身份' };
    }
    const updatedUser = await this.usersService.updateRoles(req.user.userId, body.roles);
    const loginData = await this.authService.login(updatedUser);
    return { 
      success: true, 
      message: '身份更新成功',
      ...loginData
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('location')
  async updateLocation(@Request() req, @Body() body: { lat: number, lng: number }) {
    await this.usersService.updateLocation(req.user.userId, body.lat, body.lng);
    return { success: true };
  }

  // 开发调试用途：获取第一个管理员的 Token
  @Get('dev-admin-token')
  async getDevAdminToken() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('生产环境禁用该接口');
    }
    const allUsers = await this.usersService.findAll();
    const adminUser = allUsers.find(u => u.roles.includes(UserRole.ADMIN));
    if (!adminUser) return { success: false, message: '未找到管理员账号' };
    return this.authService.login(adminUser);
  }
}
