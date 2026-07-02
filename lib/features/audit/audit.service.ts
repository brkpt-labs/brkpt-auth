import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  type ChangePasswordEvent,
  type ResetPasswordEvent,
  type SessionAnomalyEvent,
  type SessionManualRevokeEvent,
  type SessionManualRevokeOthersEvent,
  type SignInEvent,
  type SignOutEvent,
  type SignUpEvent,
  type UserDeleteEvent,
  type VerifyEmailEvent,
} from '../../common/interfaces';
import { type AuditPort, BRKPT_AUTH_AUDIT_PORT } from './audit.port';

@Injectable()
export class AuditService {
  constructor(
    @Inject(BRKPT_AUTH_AUDIT_PORT)
    private readonly port: AuditPort,
  ) {}

  @OnEvent('brkpt-auth.*.sign-up')
  async handleSignUp(event: SignUpEvent) {
    await this.port.handleSignUp(event);
  }

  @OnEvent('brkpt-auth.*.sign-in')
  async handleSignIn(event: SignInEvent) {
    await this.port.handleSignIn(event);
  }

  @OnEvent('brkpt-auth.core.sign-out')
  async handleSignOut(event: SignOutEvent) {
    await this.port.handleSignOut(event);
  }

  @OnEvent('brkpt-auth.verify-email.verify')
  async handleVerifyEmail(event: VerifyEmailEvent) {
    await this.port.handleVerifyEmail(event);
  }

  @OnEvent('brkpt-auth.change-password.change')
  async handleChangePassword(event: ChangePasswordEvent) {
    await this.port.handleChangePassword(event);
  }

  @OnEvent('brkpt-auth.reset-password.reset')
  async handleResetPassword(event: ResetPasswordEvent) {
    await this.port.handleResetPassword(event);
  }

  @OnEvent('brkpt-auth.session.anomaly')
  async handleSessionAnomaly(event: SessionAnomalyEvent) {
    await this.port.handleSessionAnomaly(event);
  }

  @OnEvent('brkpt-auth.session.manual-revoke')
  async handleSessionManualRevoke(event: SessionManualRevokeEvent) {
    await this.port.handleSessionManualRevoke(event);
  }

  @OnEvent('brkpt-auth.session.manual-revoke-others')
  async handleSessionManualRevokeOthers(event: SessionManualRevokeOthersEvent) {
    await this.port.handleSessionManualRevokeOthers(event);
  }

  @OnEvent('brkpt-auth.user.delete')
  async handleUserDelete(event: UserDeleteEvent) {
    await this.port.handleUserDelete(event);
  }
}
