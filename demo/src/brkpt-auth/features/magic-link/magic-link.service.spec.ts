/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import {
  BrkptAuthModuleOptions,
  MagicLinkTokenData,
} from '../../common/interfaces';
import { CoreService } from '../core/core.service';
import {
  BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP,
  MagicLinkDriver,
} from './magic-link.driver';
import { BRKPT_AUTH_MAGIC_LINK_PORT, MagicLinkPort } from './magic-link.port';
import { MagicLinkService } from './magic-link.service';

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

const mockAuthenticateTokenData: MagicLinkTokenData = {
  target: 'test@example.com',
  method: 'email',
  purpose: 'authenticate',
};

const mockPort: jest.Mocked<MagicLinkPort> = {
  saveToken: jest.fn().mockResolvedValue(undefined),
  getTokenData: jest.fn().mockResolvedValue(mockAuthenticateTokenData),
  deleteToken: jest.fn().mockResolvedValue(undefined),
  mapTargetToProfile: jest.fn().mockReturnValue(mockProfile),
  findOrCreateUserByProfile: jest
    .fn()
    .mockResolvedValue({ user: mockUser, created: false }),
  extractUserIdFromUser: jest.fn().mockReturnValue(1),
};

const mockEmailDriver: jest.Mocked<MagicLinkDriver> = {
  method: 'email',
  send: jest.fn().mockResolvedValue(undefined),
};

const mockDrivers = new Map<string, MagicLinkDriver>([
  ['email', mockEmailDriver],
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
          provide: BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP,
          useValue: mockDrivers,
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
              provide: BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP,
              useValue: mockDrivers,
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
    it('should send magic link via driver and save token data', async () => {
      await service.send('test@example.com', 'email');

      expect(mockEmailDriver.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining(mockToken),
        'authenticate',
      );

      expect(mockPort.saveToken).toHaveBeenCalledWith(
        mockToken,
        {
          target: 'test@example.com',
          method: 'email',
          purpose: 'authenticate',
        },
        5 * 60 * 1000,
      );
    });

    it('should use authenticate callback url by default', async () => {
      await service.send('test@example.com', 'email');

      expect(mockEmailDriver.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('localhost:3000/auth/magic-link/authenticate'),
        'authenticate',
      );
    });

    it('should use purpose-specific callback url when purpose provided', async () => {
      await service.send('test@example.com', 'email', 'verifyEmail');

      expect(mockEmailDriver.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('localhost:3000/auth/verify-email/verify'),
        'verifyEmail',
      );

      expect(mockPort.saveToken).toHaveBeenCalledWith(
        mockToken,
        {
          target: 'test@example.com',
          method: 'email',
          purpose: 'verifyEmail',
        },
        5 * 60 * 1000,
      );
    });

    it('should include only token in generated magic link query', async () => {
      await service.send('test@example.com', 'email');

      const link = mockEmailDriver.send.mock.calls[0]![1];

      expect(link).toContain(`token=${mockToken}`);
      expect(link).not.toContain('target=');
      expect(link).not.toContain('method=');
    });

    it('should throw BadRequestException for unsupported method', async () => {
      await expect(service.send('test@example.com', 'sms')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockEmailDriver.send).not.toHaveBeenCalled();
      expect(mockPort.saveToken).not.toHaveBeenCalled();
    });

    it('should send before saving token', async () => {
      const callOrder: string[] = [];

      mockEmailDriver.send.mockImplementationOnce(async () => {
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
      const result = await service.authenticate(mockToken);

      expect(mockPort.getTokenData).toHaveBeenCalledWith(mockToken);
      expect(mockPort.deleteToken).toHaveBeenCalledWith(mockToken);
      expect(mockPort.mapTargetToProfile).toHaveBeenCalledWith(
        'email',
        'test@example.com',
      );
      expect(mockPort.findOrCreateUserByProfile).toHaveBeenCalledWith(
        mockProfile,
      );
      expect(mockCoreService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        undefined,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should pass request metadata when generating tokens', async () => {
      const metadata = {
        ip: '127.0.0.1',
        userAgent: 'jest',
      };

      const result = await service.authenticate(mockToken, metadata);

      expect(mockCoreService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        metadata,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when token data not found', async () => {
      mockPort.getTokenData.mockResolvedValueOnce(null);

      await expect(service.authenticate(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPort.deleteToken).not.toHaveBeenCalled();
      expect(mockPort.findOrCreateUserByProfile).not.toHaveBeenCalled();
      expect(mockCoreService.generateTokens).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token purpose is not authenticate', async () => {
      mockPort.getTokenData.mockResolvedValueOnce({
        target: 'test@example.com',
        method: 'email',
        purpose: 'resetPassword',
      });

      await expect(service.authenticate(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPort.deleteToken).not.toHaveBeenCalled();
      expect(mockPort.findOrCreateUserByProfile).not.toHaveBeenCalled();
      expect(mockCoreService.generateTokens).not.toHaveBeenCalled();
    });

    it('should throw when mapTargetToProfile returns undefined', async () => {
      mockPort.mapTargetToProfile.mockReturnValueOnce(undefined);

      await expect(service.authenticate(mockToken)).rejects.toThrow(
        '[brkpt-auth] mapTargetToProfile returned undefined',
      );

      expect(mockPort.deleteToken).toHaveBeenCalledWith(mockToken);
      expect(mockPort.findOrCreateUserByProfile).not.toHaveBeenCalled();
      expect(mockCoreService.generateTokens).not.toHaveBeenCalled();
    });

    it('should emit sign-in event', async () => {
      await service.authenticate(mockToken);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.magic-link.sign-in',
        expect.objectContaining({
          feature: 'magic-link',
          userId: 1,
        }),
      );
    });

    it('should emit sign-up event when user is created', async () => {
      mockPort.findOrCreateUserByProfile.mockResolvedValueOnce({
        user: mockUser,
        created: true,
      });

      await service.authenticate(mockToken);

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.magic-link.sign-up',
        expect.objectContaining({
          feature: 'magic-link',
          userId: 1,
        }),
      );
    });

    it('should not emit event when authentication fails', async () => {
      mockPort.getTokenData.mockResolvedValueOnce(null);

      await expect(service.authenticate(mockToken)).rejects.toThrow();

      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleVerificationSend', () => {
    it('should call send and return true when strategy is magic-link', async () => {
      const result = await service.handleVerificationSend({
        target: 'test@example.com',
        strategy: 'magic-link',
        method: 'email',
        purpose: 'verifyEmail',
      });

      expect(mockEmailDriver.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('localhost:3000/auth/verify-email/verify'),
        'verifyEmail',
      );

      expect(mockPort.saveToken).toHaveBeenCalledWith(
        mockToken,
        {
          target: 'test@example.com',
          method: 'email',
          purpose: 'verifyEmail',
        },
        5 * 60 * 1000,
      );

      expect(result).toBe(true);
    });

    it('should return undefined when strategy is not magic-link', async () => {
      const result = await service.handleVerificationSend({
        target: 'test@example.com',
        strategy: 'otp',
        method: 'email',
        purpose: 'verifyEmail',
      });

      expect(mockEmailDriver.send).not.toHaveBeenCalled();
      expect(mockPort.saveToken).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('handleVerificationVerify', () => {
    it('should verify token and return true when strategy is magic-link', async () => {
      mockPort.getTokenData.mockResolvedValueOnce({
        target: 'test@example.com',
        method: 'email',
        purpose: 'verifyEmail',
      });

      const result = await service.handleVerificationVerify({
        target: 'test@example.com',
        strategy: 'magic-link',
        method: 'email',
        purpose: 'verifyEmail',
        proof: mockToken,
      });

      expect(mockPort.getTokenData).toHaveBeenCalledWith(mockToken);
      expect(mockPort.deleteToken).toHaveBeenCalledWith(mockToken);
      expect(result).toBe(true);
    });

    it('should return undefined when strategy is not magic-link', async () => {
      const result = await service.handleVerificationVerify({
        target: 'test@example.com',
        strategy: 'otp',
        method: 'email',
        purpose: 'verifyEmail',
        proof: mockToken,
      });

      expect(mockPort.getTokenData).not.toHaveBeenCalled();
      expect(mockPort.deleteToken).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should throw UnauthorizedException when token data is invalid', async () => {
      mockPort.getTokenData.mockResolvedValueOnce(null);

      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'magic-link',
          method: 'email',
          purpose: 'verifyEmail',
          proof: mockToken,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when target does not match', async () => {
      mockPort.getTokenData.mockResolvedValueOnce({
        target: 'other@example.com',
        method: 'email',
        purpose: 'verifyEmail',
      });

      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'magic-link',
          method: 'email',
          purpose: 'verifyEmail',
          proof: mockToken,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when method does not match', async () => {
      mockPort.getTokenData.mockResolvedValueOnce({
        target: 'test@example.com',
        method: 'sms',
        purpose: 'verifyEmail',
      });

      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'magic-link',
          method: 'email',
          purpose: 'verifyEmail',
          proof: mockToken,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when purpose does not match', async () => {
      mockPort.getTokenData.mockResolvedValueOnce({
        target: 'test@example.com',
        method: 'email',
        purpose: 'resetPassword',
      });

      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'magic-link',
          method: 'email',
          purpose: 'verifyEmail',
          proof: mockToken,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteToken).not.toHaveBeenCalled();
    });
  });
});
