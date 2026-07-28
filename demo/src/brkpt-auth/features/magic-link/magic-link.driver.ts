import { Type } from '@nestjs/common';

import { VerificationPurpose } from '../../common/interfaces';

export const BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP = Symbol(
  'BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP',
);

export interface MagicLinkDriver {
  readonly method: string;
  send(
    target: string,
    link: string,
    purpose: VerificationPurpose,
  ): Promise<void>;
}

export const magicLinkDriverMapProvider = (
  ...driverClasses: Type<MagicLinkDriver>[]
) => ({
  provide: BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP,
  useFactory: (...drivers: MagicLinkDriver[]): Map<string, MagicLinkDriver> =>
    new Map(drivers.map((d) => [d.method, d])),
  inject: driverClasses,
});
