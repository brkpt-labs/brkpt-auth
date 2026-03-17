import { Injectable } from '@nestjs/common';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { User } from '../../../user/user.entity';
import { ResetPasswordPort } from '../../features/reset-password/reset-password.port';
import { MockHashService } from '../helpers/mock-hash.service';

@Injectable()
export class ResetPasswordAdapter implements ResetPasswordPort<User> {
  constructor(
    private readonly userRepo: MemoryUserRepository,
    private readonly mockHashService: MockHashService,
  ) {}

  async findUserByTarget(method: string, target: string): Promise<User | null> {
    switch (method) {
      case 'email':
        return this.userRepo.findOne((u) => u.email === target);
    }
    return null;
  }

  async updatePassword(user: User, newPassword: string): Promise<void> {
    const hashed = await this.mockHashService.hash(newPassword);
    await this.userRepo.update(user.id, { password: hashed });
  }

  extractUserIdFromUser(user: User): number {
    return user.id;
  }
}
