import { Inject, Injectable } from '@nestjs/common';
import { type RedisClientType } from 'redis';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { User } from '../../../user/user.entity';
import { OtpCodeData } from '../../common/interfaces';
import { OtpPort } from '../../features/otp/otp.port';
import { UserProfile } from '../types';

@Injectable()
export class OtpAdapter implements OtpPort<User, UserProfile> {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    private readonly userRepo: MemoryUserRepository,
  ) {}

  private key(target: string) {
    return `otp:${target}`;
  }

  async saveCode(
    target: string,
    data: OtpCodeData,
    ttlMs: number,
  ): Promise<void> {
    await this.redis.set(this.key(target), JSON.stringify(data), {
      expiration: { type: 'PX', value: ttlMs },
    });
  }

  async getCodeData(target: string): Promise<OtpCodeData | null> {
    const data = await this.redis.get(this.key(target));
    return data ? (JSON.parse(data) as OtpCodeData) : null;
  }

  async deleteCode(target: string): Promise<void> {
    await this.redis.del(this.key(target));
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
      verifiedEmail: null,
    });

    return { user, created: true };
  }

  extractUserIdFromUser(user: User): number {
    return user.id;
  }
}
