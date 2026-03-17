import { VerificationFeature } from '../interfaces';

export const BRKPT_AUTH_MODULE_OPTIONS = Symbol('BRKPT_AUTH_MODULE_OPTIONS');

export const VERIFICATION_FEATURE_SUBJECTS: Record<
  VerificationFeature,
  string
> = {
  verifyEmail: 'Verify your email',
  resetPassword: 'Reset your password',
};
