export const BRKPT_AUTH_CHANGE_PASSWORD_PORT = Symbol(
  'BRKPT_AUTH_CHANGE_PASSWORD_PORT',
);

export interface ChangePasswordPort<TUser = unknown> {
  findUserByJwtPayload(payload: Record<string, unknown>): Promise<TUser | null>;
  validatePassword(user: TUser, currentPassword: string): Promise<boolean>;
  updatePassword(user: TUser, newPassword: string): Promise<void>;
  extractUserIdFromJwtPayload(payload: Record<string, unknown>): unknown;
}
