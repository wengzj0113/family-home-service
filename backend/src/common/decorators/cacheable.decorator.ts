import { SetMetadata } from '@nestjs/common';

export const CACHEABLE_KEY = 'cacheable:ttl';

export const Cacheable = (ttlSeconds = 30) => SetMetadata(CACHEABLE_KEY, ttlSeconds);
