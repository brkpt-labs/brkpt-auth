/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import { BrkptAuthModuleOptions } from '../../common/interfaces';
import { CoreService } from '../core/core.service';
import { BRKPT_AUTH_MAGIC_LINK_PORT, MagicLinkPort } from './magic-link.port';
import { MagicLinkService } from './magic-link.service';
import {
  BRKPT_AUTH_MAGIC_LINK_VERIFIER_MAP,
  MagicLinkVerifier,
} from './magic-link.verifier';

const mockOptions: BrkptAuthModuleOptions = {
  jwt: {
    access: { secret: 'access-secret', expiresIn: '15m' },
    refresh: { secret: 'refresh-secret', expiresIn: '7d', transport: 'cookie' },
  },
  magicLink: {
    expiresIn: '5m',
    callbackUrls: {
      authenticate: 'http://localhost:3000/auth/magic-link/authenticate',
      verifyEmail: 'http://localhost:3000/auth/verify-email/verify',
      resetPassword: 'http://localhost:3000/auth/reset-password/reset',
    },
  },
};

const mockUser = { id: 1, email: 'test@example.com' };
const mockTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};
const mockProfile = { email: 'test@example.com' };
const mockToken = 'mock-uuid-token';

const mockPort: jest.Mocked<MagicLinkPort> = {
  saveToken: jest.fn().mockResolvedValue(undefined),
  getToken: jest.fn().mockResolvedValue('test@example.com'),
  deleteToken: jest.fn().mockResolvedValue(undefined),
  mapTargetToProfile: jest.fn().mockReturnValue(mockProfile),
  findOrCreateUserByProfile: jest
    .fn()
    .mockResolvedValue({ user: mockUser, created: false }),
  extractUserIdFromUser: jest.fn().mockReturnValue(1),
};

const mockEmailVerifier: jest.Mocked<MagicLinkVerifier> = {
  method: 'email',
  send: jest.fn().mockResolvedValue(undefined),
};

const mockVerifiers = new Map<string, MagicLinkVerifier>([
  ['email', mockEmailVerifier],
]);

const mockCoreService = {
  generateTokens: jest.fn().mockResolvedValue(mockTokens),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([]),
};

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid-token'),
}));

describe('MagicLinkService', () => {
  let service: MagicLinkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MagicLinkService,
        { provide: BRKPT_AUTH_MAGIC_LINK_PORT, useValue: mockPort },
        {
          provide: BRKPT_AUTH_MAGIC_LINK_VERIFIER_MAP,
          useValue: mockVerifiers,
        },
        { provide: BRKPT_AUTH_MODULE_OPTIONS, useValue: mockOptions },
        { provide: CoreService, useValue: mockCoreService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<MagicLinkService>(MagicLinkService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('should throw when magicLink options not configured', async () => {
      const optionsWithoutMagicLink: BrkptAuthModuleOptions = {
        jwt: mockOptions.jwt,
      };

      await expect(
        Test.createTestingModule({
          providers: [
            MagicLinkService,
            { provide: BRKPT_AUTH_MAGIC_LINK_PORT, useValue: mockPort },
            {
              provide: BRKPT_AUTH_MAGIC_LINK_VERIFIER_MAP,
              useValue: mockVerifiers,
            },
            {
              provide: BRKPT_AUTH_MODULE_OPTIONS,
              useValue: optionsWithoutMagicLink,
            },
            { provide: CoreService, useValue: mockCoreService },
            { provide: EventEmitter2, useValue: mockEventEmitter },
          ],
        }).compile(),
      ).rejects.toThrow(
        '[brkpt-auth] MagicLinkService requires options.magicLink to be configured.',
      );
    });
  });

  describe('send', () => {
    it('should send magic link via verifier and save token', async () => {
      await service.send('test@example.com', 'email');

      expect(mockEmailVerifier.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining(mockToken),
        undefined,
      );
      expect(mockPort.saveToken).toHaveBeenCalledWith(
        'test@example.com',
        mockToken,
        5 * 60 * 1000,
      );
    });

    it('should use authenticate callback url when no feature provided', async () => {
      await service.send('test@example.com', 'email');

      expect(mockEmailVerifier.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('localhost:3000/auth/magic-link/authenticate'),
        undefined,
      );
    });

    it('should use feature-specific callback url when feature provided', async () => {
      await service.send('test@example.com', 'email', 'verifyEmail');

      expect(mockEmailVerifier.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('localhost:3000/auth/verify-email/verify'),
        'verifyEmail',
      );
    });

    it('should throw BadRequestException for unsupported method', async () => {
      await expect(service.send('test@example.com', 'sms')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should send before saving token', async () => {
      const callOrder: string[] = [];
      mockEmailVerifier.send.mockImplementationOnce(async () => {
        callOrder.push('send');
      });
      mockPort.saveToken.mockImplementationOnce(async () => {
        callOrder.push('saveToken');
      });

      await service.send('test@example.com', 'email');

      expect(callOrder).toEqual(['send', 'saveToken']);
    });
  });

  describe('authenticate', () => {
    it('should authenticate and return tokens', async () => {
      const result = await service.authenticate(
        'test@example.com',
        'email',
        mockToken,
      );

      expect(mockPort.deleteToken).toHaveBeenCalledWith(mockToken);
      expect(mockPort.findOrCreateUserByProfile).toHaveBeenCalledWith(
        mockProfile,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when token not found', async () => {
      mockPort.getToken.mockResolvedValueOnce(null);

      await expect(
        service.authenticate('test@example.com', 'email', mockToken),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPort.deleteToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when target does not match', async () => {
      mockPort.getToken.mockResolvedValueOnce('other@example.com');

      await expect(
        service.authenticate('test@example.com', 'email', mockToken),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPort.deleteToken).not.toHaveBeenCalled();
    });

    it('should throw when mapTargetToProfile returns undefined', async () => {
      mockPort.mapTargetToProfile.mockReturnValueOnce(undefined);

      await expect(
        service.authenticate('test@example.com', 'email', mockToken),
      ).rejects.toThrow('[brkpt-auth] mapTargetToProfile returned undefined');
    });

    it('should emit sign-in event', async () => {
      await service.authenticate('test@example.com', 'email', mockToken);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.magic-link.sign-in',
        expect.objectContaining({ feature: 'magic-link', userId: 1 }),
      );
    });

    it('should emit sign-up event when user is created', async () => {
      mockPort.findOrCreateUserByProfile.mockResolvedValueOnce({
        user: mockUser,
        created: true,
      });

      await service.authenticate('test@example.com', 'email', mockToken);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.magic-link.sign-up',
        expect.objectContaining({ feature: 'magic-link', userId: 1 }),
      );
    });

    it('should not emit event when authentication fails', async () => {
      mockPort.getToken.mockResolvedValueOnce(null);

      await expect(
        service.authenticate('test@example.com', 'email', mockToken),
      ).rejects.toThrow();
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleVerificationSend', () => {
    it('should call send and return true when strategy is magic-link', async () => {
      const result = await service.handleVerificationSend({
        target: 'test@example.com',
        strategy: 'magic-link',
        method: 'email',
        feature: 'verifyEmail',
      });

      expect(mockEmailVerifier.send).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return undefined when strategy is not magic-link', async () => {
      const result = await service.handleVerificationSend({
        target: 'test@example.com',
        strategy: 'otp',
        method: 'email',
        feature: 'verifyEmail',
      });

      expect(mockEmailVerifier.send).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('handleVerificationVerify', () => {
    it('should verify token and return true when strategy is magic-link', async () => {
      const result = await service.handleVerificationVerify({
        target: 'test@example.com',
        strategy: 'magic-link',
        proof: mockToken,
      });

      expect(mockPort.deleteToken).toHaveBeenCalledWith(mockToken);
      expect(result).toBe(true);
    });

    it('should return undefined when strategy is not magic-link', async () => {
      const result = await service.handleVerificationVerify({
        target: 'test@example.com',
        strategy: 'otp',
        proof: mockToken,
      });

      expect(mockPort.getToken).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockPort.getToken.mockResolvedValueOnce(null);

      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'magic-link',
          proof: mockToken,
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPort.deleteToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when target does not match', async () => {
      mockPort.getToken.mockResolvedValueOnce('other@example.com');

      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'magic-link',
          proof: mockToken,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
