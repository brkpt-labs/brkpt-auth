import { Injectable } from '@nestjs/common';

import {
  type ChangePasswordEvent,
  type ResetPasswordEvent,
  type SessionAnomalyEvent,
  SessionManualRevokeEvent,
  SessionManualRevokeOthersEvent,
  type SignInEvent,
  type SignOutEvent,
  SignUpEvent,
  type UserDeleteEvent,
  type VerifyEmailEvent,
} from '../../common/interfaces';
import { type AuditPort } from '../../features/audit/audit.port';

@Injectable()
export class AuditAdapter implements AuditPort {
  private log(event: string, fields: Record<string, unknown>) {
    console.log(
      JSON.stringify({
        logger: 'brkpt-auth:audit',
        event,
        ...fields,
      }),
    );
  }

  handleSignUp({
    userId,
    feature,
    timestamp,
    metadata,
  }: SignUpEvent): Promise<void> | void {
    this.log('sign_up', {
      userId: String(userId),
      feature,
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  handleSignIn({ userId, feature, timestamp, metadata }: SignInEvent) {
    this.log('sign_in', {
      userId: String(userId),
      feature,
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  handleSignOut({ userId, timestamp, metadata }: SignOutEvent) {
    this.log('sign_out', {
      userId: String(userId),
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  handleVerifyEmail({ userId, timestamp, metadata }: VerifyEmailEvent) {
    this.log('verify_email', {
      userId: String(userId),
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  handleChangePassword({ userId, timestamp, metadata }: ChangePasswordEvent) {
    this.log('change_password', {
      userId: String(userId),
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  handleResetPassword({ userId, timestamp, metadata }: ResetPasswordEvent) {
    this.log('reset_password', {
      userId: String(userId),
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  handleSessionAnomaly({
    sessionId,
    userId,
    type,
    previous,
    current,
  }: SessionAnomalyEvent) {
    this.log('session_anomaly', {
      sessionId,
      userId: String(userId),
      type,
      message: `${type}: ${previous} → ${current}`,
    });
  }

  handleSessionManualRevoke({
    sessionId,
    userId,
    timestamp,
    metadata,
  }: SessionManualRevokeEvent) {
    this.log('session_manual_revoke', {
      sessionId,
      userId: String(userId),
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  handleSessionManualRevokeOthers({
    userId,
    timestamp,
    metadata,
  }: SessionManualRevokeOthersEvent) {
    this.log('session_manual_revoke_others', {
      userId: String(userId),
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  handleUserDelete({ userId, timestamp, metadata }: UserDeleteEvent) {
    this.log('user_delete', {
      userId: String(userId),
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }
}
