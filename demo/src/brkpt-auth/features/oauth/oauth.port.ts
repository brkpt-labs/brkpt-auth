export const BRKPT_AUTH_OAUTH_PORT = Symbol('BRKPT_AUTH_OAUTH_PORT');

export interface OAuthPort<TUser = unknown, TProfile = object> {
  mapRawToProfile(provider: string, raw: unknown): TProfile | undefined;
  findOrCreateUserByProfile(
    profile: TProfile,
  ): Promise<{ user: TUser; created: boolean }>;
  extractUserIdFromUser(user: TUser): unknown;
}
