/* eslint-disable @typescript-eslint/unbound-method */

import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { CoreService } from '../core/core.service';
import { BRKPT_AUTH_OAUTH_PORT, OAuthPort } from './oauth.port';
import { OAuthService } from './oauth.service';
import { BRKPT_AUTH_OAUTH_VERIFIER_MAP, OAuthVerifier } from './oauth.verifier';

const mockUser = { id: 1, email: 'test@example.com' };
const mockTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};
const mockProfile = { email: 'test@example.com', name: 'Test User' };
const mockRaw = { email: 'test@example.com', name: 'Test User', sub: '123' };

const mockPort: jest.Mocked<OAuthPort> = {
  mapRawToProfile: jest.fn().mockReturnValue(mockProfile),
  findOrCreateUserByProfile: jest
    .fn()
    .mockResolvedValue({ user: mockUser, created: false }),
  extractUserIdFromUser: jest.fn().mockReturnValue(1),
};

const mockGoogleVerifier: jest.Mocked<OAuthVerifier> = {
  provider: 'google',
  verify: jest.fn().mockResolvedValue(mockRaw),
};

const mockGithubVerifier: jest.Mocked<OAuthVerifier> = {
  provider: 'github',
  verify: jest.fn().mockResolvedValue(mockRaw),
};

const mockVerifiers = new Map<string, OAuthVerifier>([
  ['google', mockGoogleVerifier],
  ['github', mockGithubVerifier],
]);

const mockCoreService = {
  generateTokens: jest.fn().mockResolvedValue(mockTokens),
};

const mockEventEmitter = {
  emitAsync: jest.fn().mockResolvedValue([]),
};

describe('OAuthService', () => {
  let service: OAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: BRKPT_AUTH_OAUTH_PORT, useValue: mockPort },
        { provide: BRKPT_AUTH_OAUTH_VERIFIER_MAP, useValue: mockVerifiers },
        { provide: CoreService, useValue: mockCoreService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('authenticate', () => {
    it('should authenticate with google and return tokens', async () => {
      const result = await service.authenticate({}, 'google');

      expect(mockGoogleVerifier.verify).toHaveBeenCalledWith({});
      expect(mockPort.mapRawToProfile).toHaveBeenCalledWith('google', mockRaw);
      expect(mockPort.findOrCreateUserByProfile).toHaveBeenCalledWith(
        mockProfile,
      );
      expect(mockCoreService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        undefined,
      );
      expect(result).toEqual(mockTokens);
    });

    it('should authenticate with github and return tokens', async () => {
      const result = await service.authenticate({}, 'github');

      expect(mockGithubVerifier.verify).toHaveBeenCalledWith({});
      expect(result).toEqual(mockTokens);
    });

    it('should throw BadRequestException for unsupported provider', async () => {
      await expect(service.authenticate({}, 'facebook')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when mapRawToProfile returns undefined', async () => {
      mockPort.mapRawToProfile.mockReturnValueOnce(undefined);

      await expect(service.authenticate({}, 'google')).rejects.toThrow(
        '[brkpt-auth] mapRawToProfile returned undefined for provider: google',
      );
    });

    it('should emit sign-in event after successful authentication', async () => {
      await service.authenticate({}, 'google');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.oauth.sign-in',
        expect.objectContaining({ feature: 'oauth', userId: 1 }),
      );
    });

    it('should emit sign-up event when user is created', async () => {
      mockPort.findOrCreateUserByProfile.mockResolvedValueOnce({
        user: mockUser,
        created: true,
      });

      await service.authenticate({}, 'google');

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'brkpt-auth.oauth.sign-up',
        expect.objectContaining({ feature: 'oauth', userId: 1 }),
      );
    });

    it('should not emit event when authentication fails', async () => {
      mockPort.mapRawToProfile.mockReturnValueOnce(undefined);

      await expect(service.authenticate({}, 'google')).rejects.toThrow();
      expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });
});
