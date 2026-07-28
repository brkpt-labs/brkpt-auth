import { MagicLinkTokenData } from '../../common/interfaces';

export const BRKPT_AUTH_MAGIC_LINK_PORT = Symbol('BRKPT_AUTH_MAGIC_LINK_PORT');

export interface MagicLinkPort<TUser = unknown, TProfile = object> {
  saveToken(
    token: string,
    data: MagicLinkTokenData,
    ttlMs: number,
  ): Promise<void>;
  getTokenData(token: string): Promise<MagicLinkTokenData | null>;
  deleteToken(token: string): Promise<void>;
  mapTargetToProfile(method: string, target: string): TProfile | undefined;
  findOrCreateUserByProfile(
    profile: TProfile,
  ): Promise<{ user: TUser; created: boolean }>;
  extractUserIdFromUser(user: TUser): unknown;
}
