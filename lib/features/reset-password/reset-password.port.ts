export const BRKPT_AUTH_RESET_PASSWORD_PORT = Symbol(
  'BRKPT_AUTH_RESET_PASSWORD_PORT',
);

export interface ResetPasswordPort<TUser = unknown> {
  findUserByTarget(method: string, target: string): Promise<TUser | null>;
  updatePassword(user: TUser, newPassword: string): Promise<void>;
  extractUserIdFromUser(user: TUser): unknown;
}
