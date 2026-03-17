import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  ChangePasswordEvent,
  RequestMetadata,
  SessionRevokeOthersEvent,
} from '../../common/interfaces';
import {
  BRKPT_AUTH_CHANGE_PASSWORD_PORT,
  type ChangePasswordPort,
} from './change-password.port';

@Injectable()
export class ChangePasswordService {
  constructor(
    @Inject(BRKPT_AUTH_CHANGE_PASSWORD_PORT)
    private readonly port: ChangePasswordPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async change(
    payload: Record<string, unknown>,
    currentPassword: string,
    newPassword: string,
    metadata?: RequestMetadata,
  ) {
    const user = await this.port.findUserByJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await this.port.validatePassword(user, currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    await this.port.updatePassword(user, newPassword);

    void this.eventEmitter.emitAsync('brkpt-auth.session.revoke-others', {
      sessionId: payload.sid as string,
      userId: this.port.extractUserIdFromJwtPayload(payload),
    } satisfies SessionRevokeOthersEvent);

    void this.eventEmitter.emitAsync('brkpt-auth.change-password.change', {
      userId: this.port.extractUserIdFromJwtPayload(payload),
      timestamp: Date.now(),
      metadata,
    } satisfies ChangePasswordEvent);
  }
}
