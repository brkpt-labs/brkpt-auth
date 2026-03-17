import { Injectable } from '@nestjs/common';

import { MemoryUserRepository } from '../../../user/repositories/memory-user.repository';
import { User } from '../../../user/user.entity';
import { CredentialsPort } from '../../features/credentials/credentials.port';
import { SignInDto } from '../../features/credentials/dto/sign-in.dto';
import { SignUpDto } from '../../features/credentials/dto/sign-up.dto';
import { MockHashService } from '../helpers/mock-hash.service';

@Injectable()
export class CredentialsAdapter implements CredentialsPort<User> {
  constructor(
    private readonly userRepo: MemoryUserRepository,
    private readonly mockHashService: MockHashService,
  ) {}

  findUserByDto(dto: SignInDto | SignUpDto): Promise<User | null> {
    return this.userRepo.findOne((u) => u.email === dto.email);
  }

  validatePassword(user: User, dto: SignInDto): Promise<boolean> {
    return this.mockHashService.compare(dto.password, user.password);
  }

  async createUser(dto: SignUpDto): Promise<User> {
    const hashedPassword = await this.mockHashService.hash(dto.password);
    return this.userRepo.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
      emailVerified: false,
    });
  }

  extractUserIdFromUser(user: User): number {
    return user.id;
  }
}
