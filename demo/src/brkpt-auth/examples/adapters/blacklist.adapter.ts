import { Inject, Injectable } from '@nestjs/common';
import { type RedisClientType } from 'redis';

import { BlacklistPort } from '../../features/blacklist/blacklist.port';

@Injectable()
export class BlacklistAdapter implements BlacklistPort {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  private key(sessionId: string) {
    return `blacklist:${sessionId}`;
  }

  async add(sessionId: string, ttlMs: number): Promise<void> {
    await this.redis.set(this.key(sessionId), '1', {
      expiration: { type: 'PX', value: ttlMs },
    });
  }

  async exists(sessionId: string): Promise<boolean> {
    return !!(await this.redis.exists(this.key(sessionId)));
  }
}
