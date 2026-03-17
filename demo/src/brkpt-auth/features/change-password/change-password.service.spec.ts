/* eslint-disable @typescript-eslint/unbound-method */

import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import {
  BRKPT_AUTH_CHANGE_PASSWORD_PORT,
  ChangePasswordPort,
} from './change-password.port';
import { ChangePasswordService } from './change-password.service';

const mockPayload = { sub: 1, email: 'test@example.com', sid: 'session-1' };
const mockUser = { id: 1, email: 'test@example.com' };

const mockPort: jest.Mocked<ChangePasswordPort> = {
  findUserByJwtPayload: jest.fn().mockResolvedValue(mockUser),
  validatePassword: jest.fn().mockResolvedValue(true),
  updatePassword: jest.fn().mockResolvedValue(undefined),
  extractUserIdFromJwtPayload: jest.fn().mockReturnValue(1),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([]),
};

describe('ChangePasswordService', () => {
  let service: ChangePasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangePasswordService,
        { provide: BRKPT_AUTH_CHANGE_PASSWORD_PORT, useValue: mockPort },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ChangePasswordService>(ChangePasswordService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('change', () => {
    it('should update password when credentials are valid', async () => {
      await service.change(mockPayload, 'oldPassword', 'newPassword');

      expect(mockPort.validatePassword).toHaveBeenCalledWith(
        mockUser,
        'oldPassword',
      );
      expect(mockPort.updatePassword).toHaveBeenCalledWith(
        mockUser,
        'newPassword',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPort.findUserByJwtPayload.mockResolvedValueOnce(null);

      await expect(
        service.change(mockPayload, 'oldPassword', 'newPassword'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPort.validatePassword).not.toHaveBeenCalled();
      expect(mockPort.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockPort.validatePassword.mockResolvedValueOnce(false);

      await expect(
        service.change(mockPayload, 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPort.updatePassword).not.toHaveBeenCalled();
    });

    it('should emit revoke-others event after updating password', async () => {
      await service.change(mockPayload, 'oldPassword', 'newPassword');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.session.revoke-others',
        expect.objectContaining({ sessionId: 'session-1', userId: 1 }),
      );
    });

    it('should emit change-password audit event', async () => {
      await service.change(mockPayload, 'oldPassword', 'newPassword');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.change-password.change',
        expect.objectContaining({ userId: 1 }),
      );
    });

    it('should not emit any events when password change fails', async () => {
      mockPort.validatePassword.mockResolvedValueOnce(false);

      await expect(
        service.change(mockPayload, 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });
});
