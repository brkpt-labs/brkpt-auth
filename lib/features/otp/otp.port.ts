import { OtpCodeData } from '../../common/interfaces';

export const BRKPT_AUTH_OTP_PORT = Symbol('BRKPT_AUTH_OTP_PORT');

export interface OtpPort<TUser = unknown, TProfile = object> {
  saveCode(target: string, data: OtpCodeData, ttlMs: number): Promise<void>;
  getCodeData(target: string): Promise<OtpCodeData | null>;
  deleteCode(target: string): Promise<void>;
  mapTargetToProfile(method: string, target: string): TProfile | undefined;
  findOrCreateUserByProfile(
    profile: TProfile,
  ): Promise<{ user: TUser; created: boolean }>;
  extractUserIdFromUser(user: TUser): unknown;
}
