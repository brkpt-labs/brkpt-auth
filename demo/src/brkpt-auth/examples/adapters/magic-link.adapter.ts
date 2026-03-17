import { Inject, Injectable } from '@nestjs/common';
import { type RedisClientType } from 'redis';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { User } from '../../../user/user.entity';
import { MagicLinkPort } from '../../features/magic-link/magic-link.port';
import { UserProfile } from '../types';

@Injectable()
export class MagicLinkAdapter implements MagicLinkPort<User> {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: RedisClientType,
    private readonly userRepo: MemoryUserRepository,
  ) {}

  private key(token: string) {
    return `magic-link:${token}`;
  }

  async saveToken(target: string, token: string, ttlMs: number): Promise<void> {
    await this.redis.set(this.key(token), target, {
      expiration: { type: 'PX', value: ttlMs },
    });
  }

  getToken(token: string): Promise<string | null> {
    return this.redis.get(this.key(token));
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

  async findOrCreateUserByProfile(profile: UserProfile): Promise<User> {
    const user = await this.userRepo.findOne((u) => u.email === profile.email);
    if (user) {
      return user;
    }

    return this.userRepo.create({
      email: profile.email,
      name: profile.name,
      password: '',
      emailVerified: false,
    });
  }

  extractUserIdFromUser(user: User): number {
    return user.id;
  }
}
