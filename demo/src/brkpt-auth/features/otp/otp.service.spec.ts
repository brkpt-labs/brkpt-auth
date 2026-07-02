/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import { BrkptAuthModuleOptions } from '../../common/interfaces';
import { CoreService } from '../core/core.service';
import { BRKPT_AUTH_OTP_PORT, OtpPort } from './otp.port';
import { OtpService } from './otp.service';
import { BRKPT_AUTH_OTP_VERIFIER_MAP, OtpVerifier } from './otp.verifier';

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

const mockPort: jest.Mocked<OtpPort> = {
  saveCode: jest.fn().mockResolvedValue(undefined),
  getCode: jest.fn().mockResolvedValue('123456'),
  deleteCode: jest.fn().mockResolvedValue(undefined),
  mapTargetToProfile: jest.fn().mockReturnValue(mockProfile),
  findOrCreateUserByProfile: jest
    .fn()
    .mockResolvedValue({ user: mockUser, created: false }),
  extractUserIdFromUser: jest.fn().mockReturnValue(1),
};

const mockEmailVerifier: jest.Mocked<OtpVerifier> = {
  method: 'email',
  send: jest.fn().mockResolvedValue(undefined),
};

const mockVerifiers = new Map<string, OtpVerifier>([
  ['email', mockEmailVerifier],
]);

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
        { provide: BRKPT_AUTH_OTP_VERIFIER_MAP, useValue: mockVerifiers },
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
            { provide: BRKPT_AUTH_OTP_VERIFIER_MAP, useValue: mockVerifiers },
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
    it('should generate code, send via verifier and save to port', async () => {
      await service.send('test@example.com', 'email');

      expect(mockEmailVerifier.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        undefined,
      );
      expect(mockPort.saveCode).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        5 * 60 * 1000,
      );
    });

    it('should pass feature to verifier when provided', async () => {
      await service.send('test@example.com', 'email', 'verifyEmail');

      expect(mockEmailVerifier.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'verifyEmail',
      );
    });

    it('should throw BadRequestException for unsupported method', async () => {
      await expect(service.send('test@example.com', 'sms')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should send before saving code', async () => {
      const callOrder: string[] = [];
      mockEmailVerifier.send.mockImplementationOnce(async () => {
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
      const result = await service.authenticate(
        'test@example.com',
        'email',
        '123456',
      );

      expect(mockPort.deleteCode).toHaveBeenCalledWith('test@example.com');
      expect(mockPort.findOrCreateUserByProfile).toHaveBeenCalledWith(
        mockProfile,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when code not found', async () => {
      mockPort.getCode.mockResolvedValueOnce(null);

      await expect(
        service.authenticate('test@example.com', 'email', '123456'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPort.deleteCode).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when code is wrong', async () => {
      await expect(
        service.authenticate('test@example.com', 'email', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPort.deleteCode).not.toHaveBeenCalled();
    });

    it('should throw when mapTargetToProfile returns undefined', async () => {
      mockPort.mapTargetToProfile.mockReturnValueOnce(undefined);

      await expect(
        service.authenticate('test@example.com', 'email', '123456'),
      ).rejects.toThrow('[brkpt-auth] mapTargetToProfile returned undefined');
    });

    it('should emit sign-in event', async () => {
      await service.authenticate('test@example.com', 'email', '123456');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.otp.sign-in',
        expect.objectContaining({ feature: 'otp', userId: 1 }),
      );
    });

    it('should emit sign-up event when user is created', async () => {
      mockPort.findOrCreateUserByProfile.mockResolvedValueOnce({
        user: mockUser,
        created: true,
      });

      await service.authenticate('test@example.com', 'email', '123456');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.otp.sign-up',
        expect.objectContaining({ feature: 'otp', userId: 1 }),
      );
    });

    it('should not emit event when authentication fails', async () => {
      mockPort.getCode.mockResolvedValueOnce(null);

      await expect(
        service.authenticate('test@example.com', 'email', '123456'),
      ).rejects.toThrow();
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleVerificationSend', () => {
    it('should call send when strategy is otp', async () => {
      const result = await service.handleVerificationSend({
        target: 'test@example.com',
        strategy: 'otp',
        method: 'email',
        feature: 'verifyEmail',
      });

      expect(mockEmailVerifier.send).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return undefined when strategy is not otp', async () => {
      const result = await service.handleVerificationSend({
        target: 'test@example.com',
        strategy: 'magic-link',
        method: 'email',
        feature: 'verifyEmail',
      });

      expect(mockEmailVerifier.send).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('handleVerificationVerify', () => {
    it('should verify code and return true when strategy is otp', async () => {
      const result = await service.handleVerificationVerify({
        target: 'test@example.com',
        strategy: 'otp',
        proof: '123456',
      });

      expect(mockPort.deleteCode).toHaveBeenCalledWith('test@example.com');
      expect(result).toBe(true);
    });

    it('should return undefined when strategy is not otp', async () => {
      const result = await service.handleVerificationVerify({
        target: 'test@example.com',
        strategy: 'magic-link',
        proof: '123456',
      });

      expect(mockPort.getCode).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should throw UnauthorizedException when code is invalid', async () => {
      await expect(
        service.handleVerificationVerify({
          target: 'test@example.com',
          strategy: 'otp',
          proof: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPort.deleteCode).not.toHaveBeenCalled();
    });
  });
});
