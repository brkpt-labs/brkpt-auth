import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  RequestMetadata,
  SignInEvent,
  SignUpEvent,
} from '../../common/interfaces';
import { CoreService } from '../core/core.service';
import {
  BRKPT_AUTH_CREDENTIALS_PORT,
  type CredentialsPort,
} from './credentials.port';

@Injectable()
export class CredentialsService {
  constructor(
    @Inject(BRKPT_AUTH_CREDENTIALS_PORT)
    private readonly port: CredentialsPort,
    private readonly coreService: CoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async signUp(dto: unknown, metadata?: RequestMetadata) {
    const existingUser = await this.port.findUserByDto(dto);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = await this.port.createUser(dto);

    void this.eventEmitter.emitAsync('brkpt-auth.credentials.sign-up', {
      userId: this.port.extractUserIdFromUser(user),
      feature: 'credentials',
      timestamp: Date.now(),
      metadata,
    } satisfies SignUpEvent);

    void this.eventEmitter.emitAsync('brkpt-auth.credentials.sign-in', {
      userId: this.port.extractUserIdFromUser(user),
      feature: 'credentials',
      timestamp: Date.now(),
      metadata,
    } satisfies SignInEvent);

    return this.coreService.generateTokens(user, metadata);
  }

  async signIn(dto: unknown, metadata?: RequestMetadata) {
    const user = await this.port.findUserByDto(dto);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.port.validatePassword(user, dto);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    void this.eventEmitter.emitAsync('brkpt-auth.credentials.sign-in', {
      userId: this.port.extractUserIdFromUser(user),
      feature: 'credentials',
      timestamp: Date.now(),
      metadata,
    } satisfies SignInEvent);

    return this.coreService.generateTokens(user, metadata);
  }
}
