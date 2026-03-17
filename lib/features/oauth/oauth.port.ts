export const BRKPT_AUTH_OAUTH_PORT = Symbol('BRKPT_AUTH_OAUTH_PORT');

export interface OAuthPort<TUser = unknown> {
  mapRawToProfile(provider: string, raw: unknown): object | undefined;
  findOrCreateUserByProfile(profile: object): Promise<TUser>;
  extractUserIdFromUser(user: TUser): unknown;
}
