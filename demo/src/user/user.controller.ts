import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Req,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Public } from '../brkpt-auth/common/decorators/public.decorator';
import {
  type BrkptAuthRequest,
  UserDeleteEvent,
} from '../brkpt-auth/common/interfaces';
import { extractRequestMetadata } from '../brkpt-auth/common/utils';
import { UpdateUserDto } from './dto/update-user.dto';
import { MemoryUserRepository } from './repositories/memory-user.repository';

@Controller('user')
export class UserController {
  constructor(
    private readonly userRepo: MemoryUserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userRepo.findOne((u) => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Public()
  @Get()
  findAll() {
    return this.userRepo.findAll();
  }

  @Patch()
  async update(@Body() dto: UpdateUserDto, @Req() req: BrkptAuthRequest) {
    const id = req.user!.sub as number;

    if (dto.email) {
      const existing = await this.userRepo.findOne(
        (u) => u.email === dto.email && u.id !== id,
      );
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    return this.userRepo.update(id, dto);
  }

  @Delete()
  async delete(@Req() req: BrkptAuthRequest) {
    const id = req.user!.sub as number;
    await this.eventEmitter.emitAsync('brkpt-auth.user.delete', {
      userId: id,
      timestamp: Date.now(),
      metadata: extractRequestMetadata(req),
    } satisfies UserDeleteEvent);
    return this.userRepo.delete(id);
  }
}
