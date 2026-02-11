import { Injectable } from '@nestjs/common';

type CacheEntry = {
  value: any;
  expireAt: number;
};

@Injectable()
export class SimpleCacheService {
  private store = new Map<string, CacheEntry>();

  get<T = any>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set(key: string, value: any, ttlSeconds = 30) {
    this.store.set(key, {
      value,
      expireAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key: string) {
    this.store.delete(key);
  }
}
