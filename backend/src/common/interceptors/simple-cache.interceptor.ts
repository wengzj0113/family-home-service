import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHEABLE_KEY } from '../decorators/cacheable.decorator';
import { SimpleCacheService } from '../services/simple-cache.service';

@Injectable()
export class SimpleCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: SimpleCacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ttl = this.reflector.get<number>(CACHEABLE_KEY, context.getHandler());
    if (!ttl) return next.handle();

    const request = context.switchToHttp().getRequest();
    const key = `${request.method}:${request.originalUrl || request.url}`;
    const cached = this.cacheService.get(key);
    if (cached !== null) return of(cached);

    return next.handle().pipe(
      tap((value) => {
        this.cacheService.set(key, value, ttl);
      }),
    );
  }
}
