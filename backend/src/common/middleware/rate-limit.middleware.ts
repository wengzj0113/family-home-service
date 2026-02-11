import { Injectable, NestMiddleware } from '@nestjs/common';

type Counter = {
  count: number;
  windowStart: number;
};

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private static readonly LIMIT = 120;
  private static readonly WINDOW_MS = 60 * 1000;
  private static readonly counterMap = new Map<string, Counter>();

  use(req: any, res: any, next: () => void) {
    const key = (req.ip || req.socket?.remoteAddress || 'unknown').toString();
    const now = Date.now();
    const current = RateLimitMiddleware.counterMap.get(key);

    if (!current || now - current.windowStart > RateLimitMiddleware.WINDOW_MS) {
      RateLimitMiddleware.counterMap.set(key, { count: 1, windowStart: now });
      return next();
    }

    current.count += 1;
    if (current.count > RateLimitMiddleware.LIMIT) {
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后重试',
      });
    }

    next();
  }
}
