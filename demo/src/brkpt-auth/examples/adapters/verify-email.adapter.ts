import { Injectable } from '@nestjs/common';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { VerifyEmailPort } from '../../features/verify-email/verify-email.port';
import { AuthJwtPayload } from '../types';

@Injectable()
export class VerifyEmailAdapter implements VerifyEmailPort {
  constructor(private readonly userRepo: MemoryUserRepository) {}

  async isVerified(payload: AuthJwtPayload): Promise<boolean> {
    const user = await this.userRepo.findOne((u) => u.id === payload.sub);
    return user?.verifiedEmail != null;
  }

  async markVerified(payload: AuthJwtPayload, target: string): Promise<void> {
    await this.userRepo.update(payload.sub, {
      verifiedEmail: target,
    });
  }

  extractUserIdFromJwtPayload(payload: AuthJwtPayload): number {
    return payload.sub;
  }
}
