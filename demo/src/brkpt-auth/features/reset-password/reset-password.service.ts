import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  RequestMetadata,
  ResetPasswordEvent,
  SessionRevokeOthersEvent,
  VerificationSendEvent,
  VerificationVerifyEvent,
  VerificationVerifyResult,
} from '../../common/interfaces';
import {
  BRKPT_AUTH_RESET_PASSWORD_PORT,
  type ResetPasswordPort,
} from './reset-password.port';

@Injectable()
export class ResetPasswordService {
  constructor(
    @Inject(BRKPT_AUTH_RESET_PASSWORD_PORT)
    private readonly port: ResetPasswordPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async send(target: string, strategy: string, method: string) {
    const user = await this.port.findUserByTarget(method, target);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const results = await this.eventEmitter.emitAsync(
      'brkpt-auth.verification.send',
      {
        target,
        strategy,
        method,
        purpose: 'resetPassword',
      } satisfies VerificationSendEvent,
    );
    if (!results.some((r) => r === true)) {
      throw new BadRequestException(
        `Unsupported verification strategy: ${strategy}`,
      );
    }
  }

  async reset(
    strategy: string,
    proof: string,
    newPassword: string,
    target?: string,
    metadata?: RequestMetadata,
  ) {
    const results = await this.eventEmitter.emitAsync(
      'brkpt-auth.verification.verify',
      {
        target,
        strategy,
        purpose: 'resetPassword',
        proof,
      } satisfies VerificationVerifyEvent,
    );

    const verification = results.find(
      (result): result is VerificationVerifyResult => result != null,
    );
    if (!verification) {
      throw new BadRequestException(
        `Unsupported verification strategy: ${strategy}`,
      );
    }

    const user = await this.port.findUserByTarget(
      verification.method,
      verification.target,
    );
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.port.updatePassword(user, newPassword);

    void this.eventEmitter.emitAsync('brkpt-auth.session.revoke-others', {
      sessionId: '',
      userId: this.port.extractUserIdFromUser(user),
    } satisfies SessionRevokeOthersEvent);

    void this.eventEmitter.emitAsync('brkpt-auth.reset-password.reset', {
      userId: this.port.extractUserIdFromUser(user),
      timestamp: Date.now(),
      metadata,
    } satisfies ResetPasswordEvent);
  }
}
