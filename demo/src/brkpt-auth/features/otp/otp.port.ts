export const BRKPT_AUTH_OTP_PORT = Symbol('BRKPT_AUTH_OTP_PORT');

export interface OtpPort<TUser = unknown> {
  saveCode(target: string, code: string, ttlMs: number): Promise<void>;
  getCode(target: string): Promise<string | null>;
  deleteCode(target: string): Promise<void>;
  mapTargetToProfile(method: string, target: string): object | undefined;
  findOrCreateUserByProfile(profile: object): Promise<TUser>;
  extractUserIdFromUser(user: TUser): unknown;
}
