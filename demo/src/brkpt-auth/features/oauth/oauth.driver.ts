import { Type } from '@nestjs/common';

export const BRKPT_AUTH_OAUTH_DRIVER_MAP = Symbol(
  'BRKPT_AUTH_OAUTH_DRIVER_MAP',
);

export interface OAuthDriver {
  readonly provider: string;
  verify(dto: unknown): Promise<unknown>;
}

export const oauthDriverMapProvider = (
  ...driverClasses: Type<OAuthDriver>[]
) => ({
  provide: BRKPT_AUTH_OAUTH_DRIVER_MAP,
  useFactory: (...drivers: OAuthDriver[]): Map<string, OAuthDriver> =>
    new Map(drivers.map((d) => [d.provider, d])),
  inject: driverClasses,
});
