import { Injectable } from '@nestjs/common';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { VerifyEmailPort } from '../../features/verify-email/verify-email.port';
import { AuthJwtPayload } from '../types';

@Injectable()
export class VerifyEmailAdapter implements VerifyEmailPort {
  constructor(private readonly userRepo: MemoryUserRepository) {}

  async isVerified(payload: AuthJwtPayload): Promise<boolean> {
    const user = await this.userRepo.findOne((u) => u.id === payload.sub);
    return user?.emailVerified ?? false;
  }

  async markVerified(payload: AuthJwtPayload): Promise<void> {
    await this.userRepo.update(payload.sub, { emailVerified: true });
  }

  extractUserIdFromJwtPayload(payload: AuthJwtPayload): number {
    return payload.sub;
  }
}
