import { Controller, Get } from '@nestjs/common';

@Controller()
export class SystemController {
  @Get('health')
  health() {
    return {
      success: true,
      message: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
