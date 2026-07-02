import {
  ChangePasswordEvent,
  ResetPasswordEvent,
  SessionAnomalyEvent,
  SessionManualRevokeEvent,
  SessionManualRevokeOthersEvent,
  SignInEvent,
  SignOutEvent,
  SignUpEvent,
  UserDeleteEvent,
  VerifyEmailEvent,
} from '../../common/interfaces';

export const BRKPT_AUTH_AUDIT_PORT = Symbol('BRKPT_AUTH_AUDIT_PORT');

export interface AuditPort {
  handleSignUp(event: SignUpEvent): Promise<void> | void;
  handleSignIn(event: SignInEvent): Promise<void> | void;
  handleSignOut(event: SignOutEvent): Promise<void> | void;
  handleVerifyEmail(event: VerifyEmailEvent): Promise<void> | void;
  handleChangePassword(event: ChangePasswordEvent): Promise<void> | void;
  handleResetPassword(event: ResetPasswordEvent): Promise<void> | void;
  handleSessionAnomaly(event: SessionAnomalyEvent): Promise<void> | void;
  handleSessionManualRevoke(
    event: SessionManualRevokeEvent,
  ): Promise<void> | void;
  handleSessionManualRevokeOthers(
    event: SessionManualRevokeOthersEvent,
  ): Promise<void> | void;
  handleUserDelete(event: UserDeleteEvent): Promise<void> | void;
}
