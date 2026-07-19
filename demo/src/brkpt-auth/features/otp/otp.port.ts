export const BRKPT_AUTH_OTP_PORT = Symbol('BRKPT_AUTH_OTP_PORT');

export interface OtpPort<TUser = unknown, TProfile = object> {
  saveCode(target: string, code: string, ttlMs: number): Promise<void>;
  getCode(target: string): Promise<string | null>;
  deleteCode(target: string): Promise<void>;
  mapTargetToProfile(method: string, target: string): TProfile | undefined;
  findOrCreateUserByProfile(
    profile: TProfile,
  ): Promise<{ user: TUser; created: boolean }>;
  extractUserIdFromUser(user: TUser): unknown;
}
