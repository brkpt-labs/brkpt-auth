import { Injectable } from '@nestjs/common';
import { TokenPayload } from 'google-auth-library';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { User } from '../../../user/user.entity';
import { OAuthPort } from '../../features/oauth/oauth.port';
import { UserProfile } from '../types';

interface GoogleUser extends TokenPayload {
  email: string;
  name: string;
}

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
}

@Injectable()
export class OAuthAdapter implements OAuthPort<User> {
  constructor(private readonly userRepo: MemoryUserRepository) {}

  mapRawToProfile(provider: string, raw: unknown): UserProfile | undefined {
    switch (provider) {
      case 'google': {
        const r = raw as GoogleUser;
        return { email: r.email, name: r.name };
      }
      case 'github': {
        const r = raw as GitHubUser;
        return { email: r.email ?? '', name: r.name ?? r.login };
      }
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
