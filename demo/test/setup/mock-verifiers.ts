import { Injectable } from '@nestjs/common';

import { VerificationFeature } from '../../src/brkpt-auth/common/interfaces';
import { MagicLinkVerifier } from '../../src/brkpt-auth/features/magic-link/magic-link.verifier';
import { OtpVerifier } from '../../src/brkpt-auth/features/otp/otp.verifier';

@Injectable()
export class MockEmailOtpVerifier implements OtpVerifier {
  readonly method = 'email';
  private lastCode: string | null = null;
  private lastTarget: string | null = null;

  send(
    target: string,
    code: string,
    _feature?: VerificationFeature,
  ): Promise<void> {
    this.lastCode = code;
    this.lastTarget = target;
    return Promise.resolve();
  }

  getLastCode(): string | null {
    return this.lastCode;
  }

  getLastTarget(): string | null {
    return this.lastTarget;
  }

  reset(): void {
    this.lastCode = null;
    this.lastTarget = null;
  }
}

@Injectable()
export class MockEmailMagicLinkVerifier implements MagicLinkVerifier {
  readonly method = 'email';
  private lastLink: string | null = null;

  send(
    _target: string,
    link: string,
    _feature?: VerificationFeature,
  ): Promise<void> {
    this.lastLink = link;
    return Promise.resolve();
  }

  getLastToken(): string | null {
    if (!this.lastLink) return null;
    const url = new URL(this.lastLink);
    return url.searchParams.get('token');
  }

  getLastTarget(): string | null {
    if (!this.lastLink) return null;
    const url = new URL(this.lastLink);
    return url.searchParams.get('target');
  }

  reset(): void {
    this.lastLink = null;
  }
}
