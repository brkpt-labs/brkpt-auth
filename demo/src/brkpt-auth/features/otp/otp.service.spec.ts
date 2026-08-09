/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import { BrkptAuthModuleOptions, OtpCodeData } from '../../common/interfaces';
import { CoreService } from '../core/core.service';
import { BRKPT_AUTH_OTP_DRIVER_MAP, OtpDriver } from './otp.driver';
import { BRKPT_AUTH_OTP_PORT, OtpPort } from './otp.port';
import { OtpService } from './otp.service';

const mockOptions: BrkptAuthModuleOptions = {
  jwt: {
    access: { secret: 'access-secret', expiresIn: '15m' },
    refresh: { secret: 'refresh-secret', expiresIn: '7d', transport: 'cookie' },
  },
  otp: {
    expiresIn: '5m',
    codeLength: 6,
  },
};

const mockUser = { id: 1, email: 'test@example.com' };
const mockTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};
const mockProfile = { email: 'test@example.com' };

const mockAuthenticateCodeData: OtpCodeData = {
  code: '123456',
  method: 'email',
  purpose: 'authenticate',
};

const mockPort: jest.Mocked<OtpPort> = {
  saveCode: jest.fn().mockResolvedValue(undefined),
  getCodeData: jest.fn().mockResolvedValue(mockAuthenticateCodeData),
  deleteCode: jest.fn().mockResolvedValue(undefined),
  mapTargetToProfile: jest.fn().mockReturnValue(mockProfile),
  findOrCreateUserByProfile: jest
    .fn()
    .mockResolvedValue({ user: mockUser, created: false }),
  extractUserIdFromUser: jest.fn().mockReturnValue(1),
};

const mockEmailDriver: jest.Mocked<OtpDriver> = {
  method: 'email',
  send: jest.fn().mockResolvedValue(undefined),
};

const mockDrivers = new Map<string, OtpDriver>([['email', mockEmailDriver]]);

const mockCoreService = {
  generateTokens: jest.fn().mockResolvedValue(mockTokens),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([]),
};

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: BRKPT_AUTH_OTP_PORT, useValue: mockPort },
        { provide: BRKPT_AUTH_OTP_DRIVER_MAP, useValue: mockDrivers },
        { provide: BRKPT_AUTH_MODULE_OPTIONS, useValue: mockOptions },
        { provide: CoreService, useValue: mockCoreService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('should throw when otp options not configured', async () => {
      const optionsWithoutOtp: BrkptAuthModuleOptions = {
        jwt: mockOptions.jwt,
      };

      await expect(
        Test.createTestingModule({
          providers: [
            OtpService,
            { provide: BRKPT_AUTH_OTP_PORT, useValue: mockPort },
            { provide: BRKPT_AUTH_OTP_DRIVER_MAP, useValue: mockDrivers },
            { provide: BRKPT_AUTH_MODULE_OPTIONS, useValue: optionsWithoutOtp },
            { provide: CoreService, useValue: mockCoreService },
            { provide: EventEmitter2, useValue: mockEventEmitter },
          ],
        }).compile(),
      ).rejects.toThrow(
        '[brkpt-auth] OtpService requires options.otp to be configured.',
      );
    });
  });

  describe('send', () => {
    it('should generate code, send via driver and save code data', async () => {
      await service.send('test@example.com', 'email');

      expect(mockEmailDriver.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'authenticate',
      );

      expect(mockPort.saveCode).toHaveBeenCalledWith(
        'test@example.com',
        {
          code: expect.any(String),
          method: 'email',
          purpose: 'authenticate',
        },
        5 * 60 * 1000,
      );
    });

    it('should generate a code with configured length', async () => {
      await service.send('test@example.com', 'email');

      expect(mockEmailDriver.send).toHaveBeenCalled();

      const [, code] = mockEmailDriver.send.mock.calls[0]!;

      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should pass purpose to driver and save code data when purpose provided', async () => {
      await service.send('test@example.com', 'email', 'verifyEmail');

      expect(mockEmailDriver.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'verifyEmail',
      );

      expect(mockPort.saveCode).toHaveBeenCalledWith(
        'test@example.com',
        {
          code: expect.any(String),
          method: 'email',
          purpose: 'verifyEmail',
        },
        5 * 60 * 1000,
      );
    });

    it('should throw BadRequestException for unsupported method', async () => {
      await expect(service.send('test@example.com', 'sms')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockEmailDriver.send).not.toHaveBeenCalled();
      expect(mockPort.saveCode).not.toHaveBeenCalled();
    });

    it('should send before saving code', async () => {
      const callOrder: string[] = [];

      mockEmailDriver.send.mockImplementationOnce(async () => {
        callOrder.push('send');
      });

      mockPort.saveCode.mockImplementationOnce(async () => {
        callOrder.push('saveCode');
      });

      await service.send('test@example.com', 'email');

      expect(callOrder).toEqual(['send', 'saveCode']);
    });
  });

  describe('authenticate', () => {
    it('should authenticate and return tokens', async () => {
      const result = await service.authenticate('test@example.com', '123456');

      expect(mockPort.getCodeData).toHaveBeenCalledWith('test@example.com');
      expect(mockPort.deleteCode).toHaveBeenCalledWith('test@example.com');
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

      const result = await service.authenticate(
        'test@example.com',
        '123456',
        metadata,
      );

      expect(mockCoreService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        metadata,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when code data not found', async () => {
      mockPort.getCodeData.mockResolvedValueOnce(null);

      await expect(
        service.authenticate('test@example.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteCode).not.toHaveBeenCalled();
      expect(mockPort.findOrCreateUserByProfile).not.toHaveBeenCalled();
      expect(mockCoreService.generateTokens).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when code is wrong', async () => {
      await expect(
        service.authenticate('test@example.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteCode).not.toHaveBeenCalled();
      expect(mockPort.findOrCreateUserByProfile).not.toHaveBeenCalled();
      expect(mockCoreService.generateTokens).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when code purpose is not authenticate', async () => {
      mockPort.getCodeData.mockResolvedValueOnce({
        code: '123456',
        method: 'email',
        purpose: 'resetPassword',
      });

      await expect(
        service.authenticate('test@example.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteCode).not.toHaveBeenCalled();
      expect(mockPort.findOrCreateUserByProfile).not.toHaveBeenCalled();
      expect(mockCoreService.generateTokens).not.toHaveBeenCalled();
    });

    it('should throw when mapTargetToProfile returns undefined', async () => {
      mockPort.mapTargetToProfile.mockReturnValueOnce(undefined);

      await expect(
        service.authenticate('test@example.com', '123456'),
      ).rejects.toThrow('[brkpt-auth] mapTargetToProfile returned undefined');

      expect(mockPort.deleteCode).toHaveBeenCalledWith('test@example.com');
      expect(mockPort.findOrCreateUserByProfile).not.toHaveBeenCalled();
      expect(mockCoreService.generateTokens).not.toHaveBeenCalled();
    });

    it('should emit sign-in event', async () => {
      await service.authenticate('test@example.com', '123456');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.otp.sign-in',
        expect.objectContaining({
          feature: 'otp',
          userId: 1,
        }),
      );
    });

    it('should emit sign-up event when user is created', async () => {
      mockPort.findOrCreateUserByProfile.mockResolvedValueOnce({
        user: mockUser,
        created: true,
      });

      await service.authenticate('test@example.com', '123456');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.otp.sign-up',
        expect.objectContaining({
          feature: 'otp',
          userId: 1,
        }),
      );
    });

    it('should not emit event when authentication fails', async () => {
      mockPort.getCodeData.mockResolvedValueOnce(null);

      await expect(
        service.authenticate('test@example.com', '123456'),
      ).rejects.toThrow();

      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleVerificationSend', () => {
    it('should call send and return true when strategy is otp', async () => {
      const result = await service.handleVerificationSend({
        target: 'test@example.com',
        strategy: 'otp',
        method: 'email',
        purpose: 'verifyEmail',
      });

      expect(mockEmailDriver.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'verifyEmail',
      );

      expect(mockPort.saveCode).toHaveBeenCalledWith(
        'test@example.com',
        {
          code: expect.any(String),
          method: 'email',
          purpose: 'verifyEmail',
        },
        5 * 60 * 1000,
      );

      expect(result).toBe(true);
    });

    it('should return undefined when strategy is not otp', async () => {
      const result = await service.handleVerificationSend({
        target: 'test@example.com',
        strategy: 'magic-link',
        method: 'email',
        purpose: 'verifyEmail',
      });

      expect(mockEmailDriver.send).not.toHaveBeenCalled();
      expect(mockPort.saveCode).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('handleVerificationVerify', () => {
    it('should verify code and return true when strategy is otp', async () => {
      mockPort.getCodeData.mockResolvedValueOnce({
        code: '123456',
        method: 'email',
        purpose: 'verifyEmail',
      });

      const result = await service.handleVerificationVerify({
        target: 'test@example.com',
        strategy: 'otp',
        purpose: 'verifyEmail',
        proof: '123456',
      });

      expect(mockPort.getCodeData).toHaveBeenCalledWith('test@example.com');
      expect(mockPort.deleteCode).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({
        target: 'test@example.com',
        method: 'email',
      });
    });

    it('should return undefined when strategy is not otp', async () => {
      const result = await service.handleVerificationVerify({
        target: 'test@example.com',
        strategy: 'magic-link',
        purpose: 'verifyEmail',
        proof: '123456',
      });

      expect(mockPort.getCodeData).not.toHaveBeenCalled();
      expect(mockPort.deleteCode).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should throw UnauthorizedException when code data is invalid', async () => {
      mockPort.getCodeData.mockResolvedValueOnce(null);

      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'otp',
          purpose: 'verifyEmail',
          proof: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteCode).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when code does not match', async () => {
      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'otp',
          purpose: 'verifyEmail',
          proof: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteCode).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when purpose does not match', async () => {
      mockPort.getCodeData.mockResolvedValueOnce({
        code: '123456',
        method: 'email',
        purpose: 'resetPassword',
      });

      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'otp',
          purpose: 'verifyEmail',
          proof: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPort.deleteCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when target is missing', async () => {
      await expect(
        service.handleVerificationVerify({
          strategy: 'otp',
          purpose: 'resetPassword',
          proof: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
