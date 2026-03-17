import {
  ChangePasswordEvent,
  ResetPasswordEvent,
  SessionAnomalyEvent,
  SignInEvent,
  SignOutEvent,
  UserDeleteEvent,
  VerifyEmailEvent,
} from '../../common/interfaces';

export const BRKPT_AUTH_AUDIT_PORT = Symbol('BRKPT_AUTH_AUDIT_PORT');

export interface AuditPort {
  handleSignIn(event: SignInEvent): Promise<void> | void;
  handleSignOut(event: SignOutEvent): Promise<void> | void;
  handleVerifyEmail(event: VerifyEmailEvent): Promise<void> | void;
  handleChangePassword(event: ChangePasswordEvent): Promise<void> | void;
  handleResetPassword(event: ResetPasswordEvent): Promise<void> | void;
  handleSessionAnomaly(event: SessionAnomalyEvent): Promise<void> | void;
  handleUserDelete(event: UserDeleteEvent): Promise<void> | void;
}
