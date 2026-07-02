import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import type {
  RequestMetadata,
  SessionAnomalyEvent,
  SessionCreateEvent,
  SessionManualRevokeEvent,
  SessionManualRevokeOthersEvent,
  SessionRefreshEvent,
  SessionRevokeEvent,
  SessionRevokeOthersEvent,
  SessionValidateEvent,
  UserDeleteEvent,
} from '../../common/interfaces';
import { BRKPT_AUTH_SESSION_PORT, type SessionPort } from './session.port';

@Injectable()
export class SessionService {
  constructor(
    @Inject(BRKPT_AUTH_SESSION_PORT)
    private readonly port: SessionPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('brkpt-auth.session.create', {
    suppressErrors: false,
  })
  async handleSessionCreate({
    sessionId,
    userId,
    ttlMs,
    metadata,
  }: SessionCreateEvent) {
    const now = Date.now();
    const expiresAt = now + ttlMs;

    await this.port.create(
      sessionId,
      {
        userId,
        createdAt: now,
        lastActiveAt: now,
        expiresAt,
        metadata: {
          userAgent: metadata?.userAgent || 'unknown',
          ip: metadata?.ip || 'unknown',
        },
      },
      ttlMs,
    );
    await this.port.addToUserIndex(userId, sessionId, expiresAt);
  }

  @OnEvent('brkpt-auth.session.validate', { suppressErrors: false })
  async handleSessionValidate({ sessionId }: SessionValidateEvent) {
    const exists = await this.port.exists(sessionId);
    if (!exists) {
      throw new UnauthorizedException('Session expired or revoked');
    }
  }

  @OnEvent('brkpt-auth.session.refresh')
  async handleSessionRefresh({ sessionId, metadata }: SessionRefreshEvent) {
    const sessionData = await this.port.findById(sessionId);
    if (!sessionData) {
      return;
    }

    sessionData.lastActiveAt = Date.now();

    if (metadata?.ip && sessionData.metadata.ip !== metadata.ip) {
      void this.eventEmitter.emitAsync('brkpt-auth.session.anomaly', {
        sessionId,
        userId: sessionData.userId,
        type: 'ip_changed',
        previous: sessionData.metadata.ip!,
        current: metadata.ip,
      } satisfies SessionAnomalyEvent);
      sessionData.metadata.ip = metadata.ip;
    }

    if (
      metadata?.userAgent &&
      sessionData.metadata.userAgent !== metadata.userAgent
    ) {
      void this.eventEmitter.emitAsync('brkpt-auth.session.anomaly', {
        sessionId,
        userId: sessionData.userId,
        type: 'user_agent_changed',
        previous: sessionData.metadata.userAgent!,
        current: metadata.userAgent,
      } satisfies SessionAnomalyEvent);
      sessionData.metadata.userAgent = metadata.userAgent;
    }

    await this.port.update(sessionId, sessionData);
  }

  @OnEvent('brkpt-auth.session.revoke', { suppressErrors: false })
  async handleSessionRevoke({ sessionId }: SessionRevokeEvent) {
    const session = await this.port.findById(sessionId);
    if (session) {
      await this.port.removeFromUserIndex(session.userId, sessionId);
    }
    await this.port.delete(sessionId);
  }

  @OnEvent('brkpt-auth.session.revoke-others')
  async handleSessionRevokeOthers({
    sessionId,
    userId,
  }: SessionRevokeOthersEvent) {
    const sessionIds = await this.port.getUserIndexSessionIds(userId);
    await Promise.all(
      sessionIds
        .filter((id) => id !== sessionId)
        .map((id) =>
          this.eventEmitter.emitAsync('brkpt-auth.session.revoke', {
            sessionId: id,
          } satisfies SessionRevokeEvent),
        ),
    );
  }

  @OnEvent('brkpt-auth.user.delete', { suppressErrors: false })
  async handleUserDelete({ userId }: UserDeleteEvent) {
    const sessionIds = await this.port.getUserIndexSessionIds(userId);
    await Promise.all([
      this.port.pruneUserIndex(userId, Infinity),
      ...sessionIds.map((id) =>
        this.eventEmitter.emitAsync('brkpt-auth.session.revoke', {
          sessionId: id,
        } satisfies SessionRevokeEvent),
      ),
    ]);
  }

  async getAll(payload: Record<string, unknown>) {
    const userId = this.port.extractUserIdFromJwtPayload(payload);
    await this.port.pruneUserIndex(userId, Date.now());
    const sessionIds = await this.port.getUserIndexSessionIds(userId);
    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const data = await this.port.findById(sessionId);
        return data ? { sessionId, ...data } : null;
      }),
    );
    return sessions.filter((s) => s !== null);
  }

  async revoke(
    payload: Record<string, unknown>,
    sessionId: string,
    metadata?: RequestMetadata,
  ) {
    const session = await this.port.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const userId = this.port.extractUserIdFromJwtPayload(payload);
    if (String(session.userId) !== String(userId)) {
      throw new ForbiddenException();
    }

    await this.eventEmitter.emitAsync('brkpt-auth.session.revoke', {
      sessionId,
    } satisfies SessionRevokeEvent);

    void this.eventEmitter.emitAsync('brkpt-auth.session.manual-revoke', {
      sessionId,
      userId,
      timestamp: Date.now(),
      metadata,
    } satisfies SessionManualRevokeEvent);
  }

  async revokeOthers(
    payload: Record<string, unknown>,
    metadata?: RequestMetadata,
  ) {
    const userId = this.port.extractUserIdFromJwtPayload(payload);
    const sessionIds = await this.port.getUserIndexSessionIds(userId);
    await Promise.all(
      sessionIds
        .filter((id) => id !== payload.sid)
        .map((id) =>
          this.eventEmitter.emitAsync('brkpt-auth.session.revoke', {
            sessionId: id,
          } satisfies SessionRevokeEvent),
        ),
    );

    void this.eventEmitter.emitAsync(
      'brkpt-auth.session.manual-revoke-others',
      {
        userId,
        timestamp: Date.now(),
        metadata,
      } satisfies SessionManualRevokeOthersEvent,
    );
  }
}
