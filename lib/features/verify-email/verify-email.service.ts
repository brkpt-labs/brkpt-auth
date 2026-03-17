import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  RequestMetadata,
  VerificationSendEvent,
  VerificationVerifyEvent,
  VerifyEmailEvent,
} from '../../common/interfaces';
import {
  BRKPT_AUTH_VERIFY_EMAIL_PORT,
  type VerifyEmailPort,
} from './verify-email.port';

@Injectable()
export class VerifyEmailService {
  constructor(
    @Inject(BRKPT_AUTH_VERIFY_EMAIL_PORT)
    private readonly port: VerifyEmailPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async send(target: string, strategy: string) {
    const results = await this.eventEmitter.emitAsync(
      'brkpt-auth.verification.send',
      {
        target,
        strategy,
        method: 'email',
        feature: 'verifyEmail',
      } satisfies VerificationSendEvent,
    );
    if (!results.some((r) => r === true)) {
      throw new BadRequestException(
        `Unsupported verification strategy: ${strategy}`,
      );
    }
  }

  async verify(
    payload: Record<string, unknown>,
    target: string,
    strategy: string,
    proof: string,
    metadata?: RequestMetadata,
  ) {
    const results = await this.eventEmitter.emitAsync(
      'brkpt-auth.verification.verify',
      {
        target,
        strategy,
        proof,
      } satisfies VerificationVerifyEvent,
    );
    if (!results.some((r) => r === true)) {
      throw new BadRequestException(
        `Unsupported verification strategy: ${strategy}`,
      );
    }

    await this.port.markVerified(payload);

    void this.eventEmitter.emitAsync('brkpt-auth.verify-email.verify', {
      userId: this.port.extractUserIdFromJwtPayload(payload),
      timestamp: Date.now(),
      metadata,
    } satisfies VerifyEmailEvent);
  }
}
