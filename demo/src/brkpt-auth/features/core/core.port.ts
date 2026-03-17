export const BRKPT_AUTH_CORE_PORT = Symbol('BRKPT_AUTH_CORE_PORT');

export interface CorePort<TUser = unknown> {
  mapUserToJwtPayload(user: TUser): Record<string, unknown>;
  shrinkJwtPayload?(payload: Record<string, unknown>): Record<string, unknown>;
  findUserByJwtPayload(payload: Record<string, unknown>): Promise<TUser | null>;
  toSafeUser(user: TUser): Record<string, unknown>;
  extractUserIdFromJwtPayload(payload: Record<string, unknown>): unknown;
}
