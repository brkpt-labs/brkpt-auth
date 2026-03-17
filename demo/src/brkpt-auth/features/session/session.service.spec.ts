/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { SessionData } from '../../common/interfaces';
import { BRKPT_AUTH_SESSION_PORT, SessionPort } from './session.port';
import { SessionService } from './session.service';

const mockSessionData: SessionData = {
  userId: 1,
  createdAt: 1000,
  lastActiveAt: 1000,
  expiresAt: 2000,
  metadata: { ip: '127.0.0.1', userAgent: 'Mozilla' },
};

const mockPort: jest.Mocked<SessionPort> = {
  create: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(true),
  findById: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve({
        ...mockSessionData,
        metadata: { ...mockSessionData.metadata },
      }),
    ),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  addToUserIndex: jest.fn().mockResolvedValue(undefined),
  removeFromUserIndex: jest.fn().mockResolvedValue(undefined),
  pruneUserIndex: jest.fn().mockResolvedValue(undefined),
  getUserIndexSessionIds: jest
    .fn()
    .mockResolvedValue(['session-1', 'session-2']),
  extractUserIdFromJwtPayload: jest.fn().mockReturnValue(1),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([]),
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: BRKPT_AUTH_SESSION_PORT, useValue: mockPort },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('handleSessionCreate', () => {
    it('should create session and add to user index', async () => {
      await service.handleSessionCreate({
        sessionId: 'session-1',
        userId: 1,
        ttlMs: 1000,
        metadata: { ip: '127.0.0.1', userAgent: 'Mozilla' },
      });

      expect(mockPort.create).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ userId: 1 }),
        1000,
      );
      expect(mockPort.addToUserIndex).toHaveBeenCalledWith(
        1,
        'session-1',
        expect.any(Number),
      );
    });

    it('should use unknown as fallback when metadata is missing', async () => {
      await service.handleSessionCreate({
        sessionId: 'session-1',
        userId: 1,
        ttlMs: 1000,
      });

      expect(mockPort.create).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          metadata: { ip: 'unknown', userAgent: 'unknown' },
        }),
        1000,
      );
    });
  });

  describe('handleSessionValidate', () => {
    it('should pass when session exists', async () => {
      mockPort.exists.mockResolvedValueOnce(true);

      await expect(
        service.handleSessionValidate({ sessionId: 'session-1' }),
      ).resolves.not.toThrow();
    });

    it('should throw UnauthorizedException when session does not exist', async () => {
      mockPort.exists.mockResolvedValueOnce(false);

      await expect(
        service.handleSessionValidate({ sessionId: 'session-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('handleSessionRefresh', () => {
    it('should update lastActiveAt', async () => {
      await service.handleSessionRefresh({ sessionId: 'session-1' });

      expect(mockPort.update).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ lastActiveAt: expect.any(Number) }),
      );
    });

    it('should do nothing when session not found', async () => {
      mockPort.findById.mockResolvedValueOnce(null);

      await service.handleSessionRefresh({ sessionId: 'session-1' });

      expect(mockPort.update).not.toHaveBeenCalled();
    });

    it('should emit anomaly event when ip changes', async () => {
      await service.handleSessionRefresh({
        sessionId: 'session-1',
        metadata: { ip: '192.168.1.1' },
      });

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.anomaly',
        expect.objectContaining({ type: 'ip_changed' }),
      );
    });

    it('should emit anomaly event when userAgent changes', async () => {
      await service.handleSessionRefresh({
        sessionId: 'session-1',
        metadata: { userAgent: 'Chrome' },
      });

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.anomaly',
        expect.objectContaining({ type: 'user_agent_changed' }),
      );
    });

    it('should not emit anomaly when ip is the same', async () => {
      await service.handleSessionRefresh({
        sessionId: 'session-1',
        metadata: { ip: '127.0.0.1' },
      });

      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleSessionRevoke', () => {
    it('should remove from user index and delete session', async () => {
      await service.handleSessionRevoke({ sessionId: 'session-1' });

      expect(mockPort.removeFromUserIndex).toHaveBeenCalledWith(1, 'session-1');
      expect(mockPort.delete).toHaveBeenCalledWith('session-1');
    });

    it('should still delete session when session data not found', async () => {
      mockPort.findById.mockResolvedValueOnce(null);

      await service.handleSessionRevoke({ sessionId: 'session-1' });

      expect(mockPort.removeFromUserIndex).not.toHaveBeenCalled();
      expect(mockPort.delete).toHaveBeenCalledWith('session-1');
    });
  });

  describe('handleSessionRevokeOthers', () => {
    it('should revoke all sessions except current', async () => {
      mockPort.getUserIndexSessionIds.mockResolvedValueOnce([
        'session-1',
        'session-2',
        'session-3',
      ]);

      await service.handleSessionRevokeOthers({
        sessionId: 'session-1',
        userId: 1,
      });

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-2' },
      );
      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-3' },
      );
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-1' },
      );
    });
  });

  describe('handleUserDelete', () => {
    it('should prune user index and revoke all sessions', async () => {
      mockPort.getUserIndexSessionIds.mockResolvedValueOnce([
        'session-1',
        'session-2',
      ]);

      await service.handleUserDelete({ userId: 1, timestamp: Date.now() });

      expect(mockPort.pruneUserIndex).toHaveBeenCalledWith(1, Infinity);
      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-1' },
      );
      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-2' },
      );
    });
  });

  describe('getAll', () => {
    it('should return all sessions for user', async () => {
      mockPort.getUserIndexSessionIds.mockResolvedValueOnce(['session-1']);
      mockPort.findById.mockResolvedValueOnce(mockSessionData);

      const result = await service.getAll({ sub: 1 });

      expect(mockPort.pruneUserIndex).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ sessionId: 'session-1' });
    });

    it('should filter out null sessions', async () => {
      mockPort.getUserIndexSessionIds.mockResolvedValueOnce([
        'session-1',
        'session-2',
      ]);
      mockPort.findById
        .mockResolvedValueOnce(mockSessionData)
        .mockResolvedValueOnce(null);

      const result = await service.getAll({ sub: 1 });

      expect(result).toHaveLength(1);
    });
  });

  describe('revoke', () => {
    it('should revoke session when user owns it', async () => {
      await service.revoke({ sub: 1 }, 'session-1');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-1' },
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPort.findById.mockResolvedValueOnce(null);

      await expect(service.revoke({ sub: 1 }, 'session-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when session belongs to another user', async () => {
      mockPort.extractUserIdFromJwtPayload.mockReturnValueOnce(2);

      await expect(service.revoke({ sub: 2 }, 'session-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('revokeOthers', () => {
    it('should revoke all sessions except current', async () => {
      mockPort.getUserIndexSessionIds.mockResolvedValueOnce([
        'session-1',
        'session-2',
      ]);

      await service.revokeOthers({ sub: 1, sid: 'session-1' });

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-2' },
      );
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-1' },
      );
    });
  });
});
