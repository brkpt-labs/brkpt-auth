export const BRKPT_AUTH_BLACKLIST_PORT = Symbol('BRKPT_AUTH_BLACKLIST_PORT');

export interface BlacklistPort {
  add(sessionId: string, ttlMs: number): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
}
