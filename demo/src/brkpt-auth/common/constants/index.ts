import { VerificationPurpose } from '../interfaces';

export const BRKPT_AUTH_MODULE_OPTIONS = Symbol('BRKPT_AUTH_MODULE_OPTIONS');

export const VERIFICATION_PURPOSE_LABELS: Record<VerificationPurpose, string> =
  {
    authenticate: 'sign in',
    verifyEmail: 'verify your email',
    resetPassword: 'reset your password',
  };
