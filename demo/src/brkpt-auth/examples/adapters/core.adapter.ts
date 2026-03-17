import { Injectable } from '@nestjs/common';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { User } from '../../../user/user.entity';
import { CorePort } from '../../features/core/core.port';
import { AuthJwtPayload } from '../types';

@Injectable()
export class CoreAdapter implements CorePort<User> {
  constructor(private readonly userRepo: MemoryUserRepository) {}

  mapUserToJwtPayload(user: User): AuthJwtPayload {
    return {
      sub: user.id,
      email: user.email,
    };
  }

  shrinkJwtPayload(payload: AuthJwtPayload): Record<string, unknown> {
    return {
      sub: payload.sub,
    };
  }

  findUserByJwtPayload(payload: AuthJwtPayload): Promise<User | null> {
    return this.userRepo.findOne((u) => u.id === payload.sub);
  }

  toSafeUser(user: User): Record<string, unknown> {
    const { password: _password, ...safe } = user;
    return safe;
  }

  extractUserIdFromJwtPayload(payload: AuthJwtPayload): number {
    return payload.sub;
  }
}
