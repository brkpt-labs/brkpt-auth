import { Injectable } from '@nestjs/common';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { User } from '../../../user/user.entity';
import { ChangePasswordPort } from '../../features/change-password/change-password.port';
import { MockHashService } from '../helpers/mock-hash.service';
import { AuthJwtPayload } from '../types';

@Injectable()
export class ChangePasswordAdapter implements ChangePasswordPort<User> {
  constructor(
    private readonly userRepo: MemoryUserRepository,
    private readonly mockHashService: MockHashService,
  ) {}

  findUserByJwtPayload(payload: AuthJwtPayload): Promise<User | null> {
    return this.userRepo.findOne((u) => u.id === payload.sub);
  }

  validatePassword(user: User, currentPassword: string): Promise<boolean> {
    return this.mockHashService.compare(currentPassword, user.password);
  }

  async updatePassword(user: User, newPassword: string): Promise<void> {
    const hashed = await this.mockHashService.hash(newPassword);
    await this.userRepo.update(user.id, { password: hashed });
  }

  extractUserIdFromJwtPayload(payload: AuthJwtPayload): number {
    return payload.sub;
  }
}
