/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import {
  BRKPT_AUTH_RESET_PASSWORD_PORT,
  ResetPasswordPort,
} from './reset-password.port';
import { ResetPasswordService } from './reset-password.service';

const mockUser = { id: 1, email: 'test@example.com' };

const mockPort: jest.Mocked<ResetPasswordPort> = {
  findUserByTarget: jest.fn().mockResolvedValue(mockUser),
  updatePassword: jest.fn().mockResolvedValue(undefined),
  extractUserIdFromUser: jest.fn().mockReturnValue(1),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([true]),
};

describe('ResetPasswordService', () => {
  let service: ResetPasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordService,
        { provide: BRKPT_AUTH_RESET_PASSWORD_PORT, useValue: mockPort },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ResetPasswordService>(ResetPasswordService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('send', () => {
    it('should find user and emit verification.send event', async () => {
      await service.send('test@example.com', 'otp', 'email');

      expect(mockPort.findUserByTarget).toHaveBeenCalledWith(
        'email',
        'test@example.com',
      );
      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.verification.send',
        {
          target: 'test@example.com',
          strategy: 'otp',
          method: 'email',
          feature: 'resetPassword',
        },
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPort.findUserByTarget.mockResolvedValueOnce(null);

      await expect(
        service.send('test@example.com', 'otp', 'email'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when no listener handles the strategy', async () => {
      mockEventEmitter.emitAsync.mockResolvedValueOnce([undefined]);

      await expect(
        service.send('test@example.com', 'unsupported', 'email'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reset', () => {
    it('should find user, verify proof and reset password', async () => {
      await service.reset(
        'test@example.com',
        'otp',
        'email',
        '123456',
        'newPassword',
      );

      expect(mockPort.findUserByTarget).toHaveBeenCalledWith(
        'email',
        'test@example.com',
      );
      expect(mockPort.updatePassword).toHaveBeenCalledWith(
        mockUser,
        'newPassword',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPort.findUserByTarget.mockResolvedValueOnce(null);

      await expect(
        service.reset(
          'test@example.com',
          'otp',
          'email',
          '123456',
          'newPassword',
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
      expect(mockPort.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when no listener handles the strategy', async () => {
      mockEventEmitter.emitAsync.mockResolvedValueOnce([undefined]);

      await expect(
        service.reset(
          'test@example.com',
          'unsupported',
          'email',
          '123456',
          'newPassword',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPort.updatePassword).not.toHaveBeenCalled();
    });

    it('should find user before verifying proof to avoid consuming verification code', async () => {
      const callOrder: string[] = [];
      mockPort.findUserByTarget.mockImplementationOnce(async () => {
        callOrder.push('findUser');
        return mockUser;
      });
      mockEventEmitter.emitAsync.mockImplementationOnce(async () => {
        callOrder.push('verify');
        return [true];
      });

      await service.reset(
        'test@example.com',
        'otp',
        'email',
        '123456',
        'newPassword',
      );

      expect(callOrder).toEqual(['findUser', 'verify']);
    });

    it('should emit revoke-others with empty sessionId to revoke all sessions', async () => {
      await service.reset(
        'test@example.com',
        'otp',
        'email',
        '123456',
        'newPassword',
      );

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke-others',
        expect.objectContaining({ sessionId: '', userId: 1 }),
      );
    });

    it('should emit reset-password audit event', async () => {
      await service.reset(
        'test@example.com',
        'otp',
        'email',
        '123456',
        'newPassword',
      );

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.reset-password.reset',
        expect.objectContaining({ userId: 1 }),
      );
    });

    it('should not emit events when user not found', async () => {
      mockPort.findUserByTarget.mockResolvedValueOnce(null);

      await expect(
        service.reset(
          'test@example.com',
          'otp',
          'email',
          '123456',
          'newPassword',
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });
});
