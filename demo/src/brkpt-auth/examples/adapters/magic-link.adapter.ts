import { Inject, Injectable } from '@nestjs/common';
import { type RedisClientType } from 'redis';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { User } from '../../../user/user.entity';
import { MagicLinkTokenData } from '../../common/interfaces';
import { MagicLinkPort } from '../../features/magic-link/magic-link.port';
import { UserProfile } from '../types';

@Injectable()
export class MagicLinkAdapter implements MagicLinkPort<User, UserProfile> {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: RedisClientType,
    private readonly userRepo: MemoryUserRepository,
  ) {}

  private key(token: string) {
    return `magic-link:${token}`;
  }

  async saveToken(
    token: string,
    data: MagicLinkTokenData,
    ttlMs: number,
  ): Promise<void> {
    await this.redis.set(this.key(token), JSON.stringify(data), {
      expiration: { type: 'PX', value: ttlMs },
    });
  }

  async getTokenData(token: string): Promise<MagicLinkTokenData | null> {
    const data = await this.redis.get(this.key(token));
    return data ? (JSON.parse(data) as MagicLinkTokenData) : null;
  }

  async deleteToken(token: string): Promise<void> {
    await this.redis.del(this.key(token));
  }

  mapTargetToProfile(method: string, target: string): UserProfile | undefined {
    switch (method) {
      case 'email':
        return { email: target, name: '' };
    }
  }

  async findOrCreateUserByProfile(
    profile: UserProfile,
  ): Promise<{ user: User; created: boolean }> {
    const existing = await this.userRepo.findOne(
      (u) => u.email === profile.email,
    );
    if (existing) {
      return { user: existing, created: false };
    }

    const user = await this.userRepo.create({
      email: profile.email,
      name: profile.name,
      password: '',
      emailVerified: false,
    });

    return { user, created: true };
  }

  extractUserIdFromUser(user: User): number {
    return user.id;
  }
}
