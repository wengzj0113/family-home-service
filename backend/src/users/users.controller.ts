import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RatingsService } from '../ratings/ratings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly ratingsService: RatingsService,
  ) {}

  @Get('worker/:id')
  async getWorkerDetail(@Param('id') id: string) {
    const worker = await this.usersService.findById(+id);
    if (!worker) return { success: false, message: '该服务人员不存在' };

    const ratings = await this.ratingsService.findByToUser(+id);
    
    return {
      success: true,
      data: {
        id: worker.id,
        nickname: worker.nickname,
        avatar: worker.avatar,
        workerScore: worker.workerScore,
        ratingCount: worker.ratingCount,
        level: worker.level,
        profile: worker.profile,
        ratings: ratings.map(r => ({
          id: r.id,
          score: r.score,
          content: r.content,
          createdAt: r.createdAt,
          fromNickname: r.fromUser?.nickname,
          fromAvatar: r.fromUser?.avatar,
        })),
      },
    };
  }
}
