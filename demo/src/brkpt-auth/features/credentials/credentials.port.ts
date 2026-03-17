export const BRKPT_AUTH_CREDENTIALS_PORT = Symbol(
  'BRKPT_AUTH_CREDENTIALS_PORT',
);

export interface CredentialsPort<TUser = unknown> {
  findUserByDto(dto: unknown): Promise<TUser | null>;
  validatePassword(user: TUser, dto: unknown): Promise<boolean>;
  createUser(dto: unknown): Promise<TUser>;
  extractUserIdFromUser(user: TUser): unknown;
}
