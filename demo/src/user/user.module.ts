import { Module } from '@nestjs/common';

import { MemoryUserRepository } from './repositories/memory-user.repository';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [MemoryUserRepository],
  exports: [MemoryUserRepository],
})
export class UserModule {}
