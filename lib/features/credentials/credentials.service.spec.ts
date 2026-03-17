/* eslint-disable @typescript-eslint/unbound-method */

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { CoreService } from '../core/core.service';
import {
  BRKPT_AUTH_CREDENTIALS_PORT,
  CredentialsPort,
} from './credentials.port';
import { CredentialsService } from './credentials.service';

const mockUser = { id: 1, email: 'test@example.com' };
const mockTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

const mockPort: jest.Mocked<CredentialsPort> = {
  findUserByDto: jest.fn(),
  validatePassword: jest.fn(),
  createUser: jest.fn(),
  extractUserIdFromUser: jest.fn().mockReturnValue(1),
};

const mockCoreService = {
  generateTokens: jest.fn().mockResolvedValue(mockTokens),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([]),
};

describe('CredentialsService', () => {
  let service: CredentialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: BRKPT_AUTH_CREDENTIALS_PORT, useValue: mockPort },
        { provide: CoreService, useValue: mockCoreService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('signUp', () => {
    it('should create user and return tokens', async () => {
      mockPort.findUserByDto.mockResolvedValueOnce(null);
      mockPort.createUser.mockResolvedValueOnce(mockUser);

      const result = await service.signUp({});

      expect(mockPort.createUser).toHaveBeenCalled();
      expect(mockCoreService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        undefined,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw ConflictException when user already exists', async () => {
      mockPort.findUserByDto.mockResolvedValueOnce(mockUser);

      await expect(service.signUp({})).rejects.toThrow(ConflictException);
      expect(mockPort.createUser).not.toHaveBeenCalled();
    });

    it('should emit sign-in audit event after sign up', async () => {
      mockPort.findUserByDto.mockResolvedValueOnce(null);
      mockPort.createUser.mockResolvedValueOnce(mockUser);

      await service.signUp({});

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.credentials.sign-in',
        expect.objectContaining({ feature: 'credentials', userId: 1 }),
      );
    });
  });

  describe('signIn', () => {
    it('should return tokens when credentials are valid', async () => {
      mockPort.findUserByDto.mockResolvedValueOnce(mockUser);
      mockPort.validatePassword.mockResolvedValueOnce(true);

      const result = await service.signIn({});

      expect(mockCoreService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        undefined,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPort.findUserByDto.mockResolvedValueOnce(null);

      await expect(service.signIn({})).rejects.toThrow(UnauthorizedException);
      expect(mockPort.validatePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockPort.findUserByDto.mockResolvedValueOnce(mockUser);
      mockPort.validatePassword.mockResolvedValueOnce(false);

      await expect(service.signIn({})).rejects.toThrow(UnauthorizedException);
      expect(mockCoreService.generateTokens).not.toHaveBeenCalled();
    });

    it('should emit sign-in audit event after successful sign in', async () => {
      mockPort.findUserByDto.mockResolvedValueOnce(mockUser);
      mockPort.validatePassword.mockResolvedValueOnce(true);

      await service.signIn({});

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.credentials.sign-in',
        expect.objectContaining({ feature: 'credentials', userId: 1 }),
      );
    });

    it('should not emit audit event when sign in fails', async () => {
      mockPort.findUserByDto.mockResolvedValueOnce(null);

      await expect(service.signIn({})).rejects.toThrow(UnauthorizedException);
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });
});
