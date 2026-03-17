/* eslint-disable @typescript-eslint/unbound-method */

import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import {
  BRKPT_AUTH_VERIFY_EMAIL_PORT,
  VerifyEmailPort,
} from './verify-email.port';
import { VerifyEmailService } from './verify-email.service';

const mockPayload = { sub: 1, email: 'test@example.com', sid: 'session-1' };

const mockPort: jest.Mocked<VerifyEmailPort> = {
  isVerified: jest.fn().mockResolvedValue(false),
  markVerified: jest.fn().mockResolvedValue(undefined),
  extractUserIdFromJwtPayload: jest.fn().mockReturnValue(1),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([true]),
};

describe('VerifyEmailService', () => {
  let service: VerifyEmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyEmailService,
        { provide: BRKPT_AUTH_VERIFY_EMAIL_PORT, useValue: mockPort },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<VerifyEmailService>(VerifyEmailService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('send', () => {
    it('should emit verification.send event with correct payload', async () => {
      await service.send('test@example.com', 'otp');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.verification.send',
        {
          target: 'test@example.com',
          strategy: 'otp',
          method: 'email',
          feature: 'verifyEmail',
        },
      );
    });

    it('should throw BadRequestException when no listener handles the strategy', async () => {
      mockEventEmitter.emitAsync.mockResolvedValueOnce([undefined]);

      await expect(
        service.send('test@example.com', 'unsupported'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no listeners exist', async () => {
      mockEventEmitter.emitAsync.mockResolvedValueOnce([]);

      await expect(service.send('test@example.com', 'otp')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verify', () => {
    it('should verify and mark user as verified', async () => {
      await service.verify(mockPayload, 'test@example.com', 'otp', '123456');

      expect(mockPort.markVerified).toHaveBeenCalledWith(mockPayload);
    });

    it('should emit verification.verify event with correct payload', async () => {
      await service.verify(mockPayload, 'test@example.com', 'otp', '123456');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.verification.verify',
        {
          target: 'test@example.com',
          strategy: 'otp',
          proof: '123456',
        },
      );
    });

    it('should throw BadRequestException when no listener handles the strategy', async () => {
      mockEventEmitter.emitAsync.mockResolvedValueOnce([undefined]);

      await expect(
        service.verify(
          mockPayload,
          'test@example.com',
          'unsupported',
          '123456',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPort.markVerified).not.toHaveBeenCalled();
    });

    it('should emit verify-email audit event after marking verified', async () => {
      await service.verify(mockPayload, 'test@example.com', 'otp', '123456');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.verify-email.verify',
        expect.objectContaining({ userId: 1 }),
      );
    });

    it('should not emit audit event when verification fails', async () => {
      mockEventEmitter.emitAsync.mockResolvedValueOnce([undefined]);

      await expect(
        service.verify(mockPayload, 'test@example.com', 'otp', 'wrong'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPort.markVerified).not.toHaveBeenCalled();
      expect(mockEventEmitter.emitAsync).toHaveBeenCalledTimes(1);
    });
  });
});
