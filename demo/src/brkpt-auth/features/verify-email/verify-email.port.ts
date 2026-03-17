export const BRKPT_AUTH_VERIFY_EMAIL_PORT = Symbol(
  'BRKPT_AUTH_VERIFY_EMAIL_PORT',
);

export interface VerifyEmailPort {
  isVerified(payload: Record<string, unknown>): Promise<boolean>;
  markVerified(payload: Record<string, unknown>): Promise<void>;
  extractUserIdFromJwtPayload(payload: Record<string, unknown>): unknown;
}
