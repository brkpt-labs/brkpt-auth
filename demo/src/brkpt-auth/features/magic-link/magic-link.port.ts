export const BRKPT_AUTH_MAGIC_LINK_PORT = Symbol('BRKPT_AUTH_MAGIC_LINK_PORT');

export interface MagicLinkPort<TUser = unknown> {
  saveToken(target: string, token: string, ttlMs: number): Promise<void>;
  getToken(token: string): Promise<string | null>;
  deleteToken(token: string): Promise<void>;
  mapTargetToProfile(method: string, target: string): object | undefined;
  findOrCreateUserByProfile(profile: object): Promise<TUser>;
  extractUserIdFromUser(user: TUser): unknown;
}
