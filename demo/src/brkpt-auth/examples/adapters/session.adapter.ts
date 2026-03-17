import { Inject, Injectable } from '@nestjs/common';
import { type RedisClientType } from 'redis';

import { SessionData } from '../../common/interfaces';
import { SessionPort } from '../../features/session/session.port';
import { AuthJwtPayload } from '../types';

@Injectable()
export class SessionAdapter implements SessionPort {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  private key(sessionId: string) {
    return `session:${sessionId}`;
  }

  private userIndexKey(userId: unknown) {
    return `session:user:${String(userId)}`;
  }

  async create(
    sessionId: string,
    data: SessionData,
    ttlMs: number,
  ): Promise<void> {
    await this.redis.set(this.key(sessionId), JSON.stringify(data), {
      expiration: { type: 'PX', value: ttlMs },
    });
  }

  async exists(sessionId: string): Promise<boolean> {
    return !!(await this.redis.exists(this.key(sessionId)));
  }

  async findById(sessionId: string): Promise<SessionData | null> {
    const data = await this.redis.get(this.key(sessionId));
    return data ? (JSON.parse(data) as SessionData) : null;
  }

  async update(sessionId: string, data: SessionData): Promise<void> {
    const key = this.key(sessionId);
    const ttlMs = await this.redis.pTTL(key);
    if (ttlMs > 0) {
      await this.redis.set(key, JSON.stringify(data), {
        expiration: { type: 'PX', value: ttlMs },
      });
    }
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }

  async addToUserIndex(
    userId: unknown,
    sessionId: string,
    expiresAt: number,
  ): Promise<void> {
    await this.redis.zAdd(this.userIndexKey(userId), {
      score: expiresAt,
      value: sessionId,
    });
  }

  async removeFromUserIndex(userId: unknown, sessionId: string): Promise<void> {
    await this.redis.zRem(this.userIndexKey(userId), sessionId);
  }

  async pruneUserIndex(userId: unknown, before: number): Promise<void> {
    await this.redis.zRemRangeByScore(
      this.userIndexKey(userId),
      '-inf',
      before,
    );
  }

  getUserIndexSessionIds(userId: unknown): Promise<string[]> {
    return this.redis.zRange(this.userIndexKey(userId), 0, -1);
  }

  extractUserIdFromJwtPayload(payload: AuthJwtPayload): number {
    return payload.sub;
  }
}
