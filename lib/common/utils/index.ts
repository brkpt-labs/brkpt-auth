import { Response } from 'express';
import ms from 'ms';

import {
  BrkptAuthModuleOptions,
  BrkptAuthRequest,
  ExpiresIn,
  RequestMetadata,
} from '../interfaces';

export function parseDurationToMs(expiresIn: ExpiresIn): number {
  if (typeof expiresIn === 'number') {
    return expiresIn * 1000;
  }

  const parsed = ms(expiresIn);

  if (typeof parsed !== 'number') {
    throw new Error(`[brkpt-auth] Invalid expiresIn value: ${expiresIn}`);
  }

  return parsed;
}

export function setRefreshToken(
  response: Response,
  refreshToken: string,
  options: BrkptAuthModuleOptions,
): Record<string, string> {
  switch (options.jwt.refresh.transport) {
    case 'cookie':
      response.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: parseDurationToMs(options.jwt.refresh.expiresIn),
      });
      return {};
    case 'body':
      return { refreshToken };
  }
}

export function clearRefreshToken(response: Response): void {
  response.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
}

export const extractRequestMetadata = (
  req: BrkptAuthRequest,
): RequestMetadata => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip,
});
