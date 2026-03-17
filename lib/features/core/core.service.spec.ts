/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import { BrkptAuthModuleOptions } from '../../common/interfaces';
import { BRKPT_AUTH_CORE_PORT, CorePort } from './core.port';
import { CoreService } from './core.service';

const mockOptions: BrkptAuthModuleOptions = {
  jwt: {
    access: { secret: 'access-secret', expiresIn: '15m' },
    refresh: { secret: 'refresh-secret', expiresIn: '7d', transport: 'cookie' },
  },
};

const mockUser = { id: 1, email: 'test@example.com' };
const mockPayload = { sub: 1, email: 'test@example.com', sid: 'session-id' };
const mockSafeUser = { id: 1, email: 'test@example.com' };

const mockPort: jest.Mocked<CorePort> = {
  mapUserToJwtPayload: jest
    .fn()
    .mockReturnValue({ sub: 1, email: 'test@example.com' }),
  findUserByJwtPayload: jest.fn().mockResolvedValue(mockUser),
  toSafeUser: jest.fn().mockReturnValue(mockSafeUser),
  extractUserIdFromJwtPayload: jest.fn().mockReturnValue(1),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verifyAsync: jest.fn(),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([]),
};

describe('CoreService', () => {
  let service: CoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoreService,
        { provide: BRKPT_AUTH_CORE_PORT, useValue: mockPort },
        { provide: BRKPT_AUTH_MODULE_OPTIONS, useValue: mockOptions },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CoreService>(CoreService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateTokens', () => {
    it('should return accessToken and refreshToken', async () => {
      const result = await service.generateTokens(mockUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should call mapUserToJwtPayload with user', async () => {
      await service.generateTokens(mockUser);

      expect(mockPort.mapUserToJwtPayload).toHaveBeenCalledWith(mockUser);
    });

    it('should emit session.create event', async () => {
      await service.generateTokens(mockUser);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.create',
        expect.objectContaining({
          userId: 1,
          ttlMs: expect.any(Number),
        }),
      );
    });

    it('should use shrinkJwtPayload for refresh token if defined', async () => {
      const shrunkenPayload = { sub: 1 };
      mockPort.shrinkJwtPayload = jest.fn().mockReturnValue(shrunkenPayload);

      await service.generateTokens(mockUser);

      expect(mockPort.shrinkJwtPayload).toHaveBeenCalled();
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 1 }),
        expect.objectContaining({ secret: 'refresh-secret' }),
      );

      delete mockPort.shrinkJwtPayload;
    });
  });

  describe('refresh', () => {
    it('should return new accessToken', async () => {
      const result = await service.refresh(mockPayload);

      expect(result).toHaveProperty('accessToken');
    });

    it('should emit session.validate before finding user', async () => {
      await service.refresh(mockPayload);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.validate',
        { sessionId: 'session-id' },
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPort.findUserByJwtPayload.mockResolvedValueOnce(null);

      await expect(service.refresh(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should emit session.refresh after generating token', async () => {
      await service.refresh(mockPayload);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.refresh',
        expect.objectContaining({ sessionId: 'session-id' }),
      );
    });
  });

  describe('me', () => {
    it('should return safe user', async () => {
      const result = await service.me(mockPayload);

      expect(result).toEqual(mockSafeUser);
      expect(mockPort.toSafeUser).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPort.findUserByJwtPayload.mockResolvedValueOnce(null);

      await expect(service.me(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('signOut', () => {
    it('should emit session.revoke', async () => {
      await service.signOut(mockPayload);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke',
        { sessionId: 'session-id' },
      );
    });

    it('should emit core.sign-out audit event', async () => {
      await service.signOut(mockPayload);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.core.sign-out',
        expect.objectContaining({ userId: 1 }),
      );
    });
  });
});
