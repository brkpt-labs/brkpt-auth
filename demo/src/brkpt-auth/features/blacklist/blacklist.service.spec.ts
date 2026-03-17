/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import { BrkptAuthModuleOptions } from '../../common/interfaces';
import { BlacklistPort, BRKPT_AUTH_BLACKLIST_PORT } from './blacklist.port';
import { BlacklistService } from './blacklist.service';

const mockOptions: BrkptAuthModuleOptions = {
  jwt: {
    access: { secret: 'access-secret', expiresIn: '15m' },
    refresh: { secret: 'refresh-secret', expiresIn: '7d', transport: 'cookie' },
  },
};

const mockPort: jest.Mocked<BlacklistPort> = {
  add: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
};

describe('BlacklistService', () => {
  let service: BlacklistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlacklistService,
        { provide: BRKPT_AUTH_BLACKLIST_PORT, useValue: mockPort },
        { provide: BRKPT_AUTH_MODULE_OPTIONS, useValue: mockOptions },
      ],
    }).compile();

    service = module.get<BlacklistService>(BlacklistService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('handleSessionRevoke', () => {
    it('should add session to blacklist with correct ttl', async () => {
      await service.handleSessionRevoke({ sessionId: 'session-1' });

      expect(mockPort.add).toHaveBeenCalledWith(
        'session-1',
        15 * 60 * 1000, // 15m in ms
      );
    });
  });
});
