import { Injectable } from '@nestjs/common';

import { VerificationPurpose } from '../../src/brkpt-auth/common/interfaces';
import { MagicLinkDriver } from '../../src/brkpt-auth/features/magic-link/magic-link.driver';
import { OtpDriver } from '../../src/brkpt-auth/features/otp/otp.driver';

@Injectable()
export class MockEmailOtpDriver implements OtpDriver {
  readonly method = 'email';
  private lastCode: string | null = null;
  private lastTarget: string | null = null;
  private lastPurpose: VerificationPurpose | null = null;

  send(
    target: string,
    code: string,
    purpose: VerificationPurpose,
  ): Promise<void> {
    this.lastCode = code;
    this.lastTarget = target;
    this.lastPurpose = purpose;
    return Promise.resolve();
  }

  getLastCode(): string | null {
    return this.lastCode;
  }

  getLastTarget(): string | null {
    return this.lastTarget;
  }

  getLastPurpose(): VerificationPurpose | null {
    return this.lastPurpose;
  }

  reset(): void {
    this.lastCode = null;
    this.lastTarget = null;
    this.lastPurpose = null;
  }
}

@Injectable()
export class MockEmailMagicLinkDriver implements MagicLinkDriver {
  readonly method = 'email';
  private lastLink: string | null = null;
  private lastTarget: string | null = null;
  private lastPurpose: VerificationPurpose | null = null;

  send(
    target: string,
    link: string,
    purpose: VerificationPurpose,
  ): Promise<void> {
    this.lastLink = link;
    this.lastTarget = target;
    this.lastPurpose = purpose;
    return Promise.resolve();
  }

  getLastLink(): string | null {
    return this.lastLink;
  }

  getLastToken(): string | null {
    if (!this.lastLink) return null;
    const url = new URL(this.lastLink);
    return url.searchParams.get('token');
  }

  getLastTarget(): string | null {
    return this.lastTarget;
  }

  getLastPurpose(): VerificationPurpose | null {
    return this.lastPurpose;
  }

  reset(): void {
    this.lastLink = null;
    this.lastTarget = null;
    this.lastPurpose = null;
  }
}
