import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import {
  type BrkptAuthModuleOptions,
  RequestMetadata,
  SessionCreateEvent,
  SessionRefreshEvent,
  SessionRevokeEvent,
  SessionValidateEvent,
  SignOutEvent,
} from '../../common/interfaces';
import { parseDurationToMs } from '../../common/utils';
import { BRKPT_AUTH_CORE_PORT, type CorePort } from './core.port';

@Injectable()
export class CoreService {
  constructor(
    @Inject(BRKPT_AUTH_CORE_PORT)
    private readonly port: CorePort,
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async refresh(payload: Record<string, unknown>, metadata?: RequestMetadata) {
    await this.eventEmitter.emitAsync('brkpt-auth.session.validate', {
      sessionId: payload.sid as string,
    } satisfies SessionValidateEvent);

    const user = await this.port.findUserByJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = await this.jwtService.signAsync({
      ...this.port.mapUserToJwtPayload(user),
      sid: payload.sid,
    });

    void this.eventEmitter.emitAsync('brkpt-auth.session.refresh', {
      sessionId: payload.sid as string,
      metadata,
    } satisfies SessionRefreshEvent);

    return { accessToken };
  }

  async me(payload: Record<string, unknown>) {
    const user = await this.port.findUserByJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.port.toSafeUser(user);
  }

  async signOut(payload: Record<string, unknown>, metadata?: RequestMetadata) {
    await this.eventEmitter.emitAsync('brkpt-auth.session.revoke', {
      sessionId: payload.sid as string,
    } satisfies SessionRevokeEvent);

    void this.eventEmitter.emitAsync('brkpt-auth.core.sign-out', {
      userId: this.port.extractUserIdFromJwtPayload(payload),
      timestamp: Date.now(),
      metadata,
    } satisfies SignOutEvent);
  }

  async generateTokens(user: unknown, metadata?: RequestMetadata) {
    const payload = this.port.mapUserToJwtPayload(user);
    const sessionId = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({
        ...payload,
        sid: sessionId,
      }),
      this.jwtService.signAsync(
        {
          ...(this.port.shrinkJwtPayload?.(payload) ?? payload),
          sid: sessionId,
        },
        {
          secret: this.options.jwt.refresh.secret,
          expiresIn: this.options.jwt.refresh.expiresIn,
        },
      ),
    ]);

    await this.eventEmitter.emitAsync('brkpt-auth.session.create', {
      sessionId,
      userId: this.port.extractUserIdFromJwtPayload(payload),
      ttlMs: parseDurationToMs(this.options.jwt.refresh.expiresIn),
      metadata,
    } satisfies SessionCreateEvent);

    return {
      accessToken,
      refreshToken,
    };
  }
}
