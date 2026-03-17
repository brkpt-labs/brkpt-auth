/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Response } from 'express';

import { BrkptAuthModuleOptions } from '../interfaces';
import { parseDurationToMs, setRefreshToken } from './index';

describe('parseDurationToMs', () => {
  it('should convert number to milliseconds', () => {
    expect(parseDurationToMs(60)).toBe(60000);
  });

  it('should parse string duration to milliseconds', () => {
    expect(parseDurationToMs('5m')).toBe(300000);
    expect(parseDurationToMs('1h')).toBe(3600000);
    expect(parseDurationToMs('7d')).toBe(604800000);
  });

  it('should throw on invalid duration string', () => {
    expect(() => parseDurationToMs('invalid' as any)).toThrow(
      '[brkpt-auth] Invalid expiresIn value: invalid',
    );
  });
});

describe('setRefreshToken', () => {
  const baseOptions: BrkptAuthModuleOptions = {
    jwt: {
      access: { secret: 'secret', expiresIn: '15m' },
      refresh: { secret: 'secret', expiresIn: '7d', transport: 'cookie' },
    },
  };

  it('should set cookie and return empty object when transport is cookie', () => {
    const mockResponse = { cookie: jest.fn() } as unknown as Response;

    const result = setRefreshToken(mockResponse, 'refresh-token', baseOptions);

    expect(mockResponse.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({});
  });

  it('should return refreshToken in body when transport is body', () => {
    const mockResponse = { cookie: jest.fn() } as unknown as Response;
    const options = {
      ...baseOptions,
      jwt: {
        ...baseOptions.jwt,
        refresh: { ...baseOptions.jwt.refresh, transport: 'body' as const },
      },
    };

    const result = setRefreshToken(mockResponse, 'refresh-token', options);

    expect(mockResponse.cookie).not.toHaveBeenCalled();
    expect(result).toEqual({ refreshToken: 'refresh-token' });
  });
});
