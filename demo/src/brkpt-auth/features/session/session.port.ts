import { SessionData } from '../../common/interfaces';

export const BRKPT_AUTH_SESSION_PORT = Symbol('BRKPT_AUTH_SESSION_PORT');

export interface SessionPort {
  create(sessionId: string, data: SessionData, ttlMs: number): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
  findById(sessionId: string): Promise<SessionData | null>;
  update(sessionId: string, data: SessionData): Promise<void>;
  delete(sessionId: string): Promise<void>;

  addToUserIndex(
    userId: unknown,
    sessionId: string,
    expiresAt: number,
  ): Promise<void>;
  removeFromUserIndex(userId: unknown, sessionId: string): Promise<void>;
  pruneUserIndex(userId: unknown, before: number): Promise<void>;
  getUserIndexSessionIds(userId: unknown): Promise<string[]>;

  extractUserIdFromJwtPayload(payload: Record<string, unknown>): unknown;
}
