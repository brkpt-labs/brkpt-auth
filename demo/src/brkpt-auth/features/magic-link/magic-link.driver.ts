import { Type } from '@nestjs/common';

import { VerificationFeature } from '../../common/interfaces';

export const BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP = Symbol(
  'BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP',
);

export interface MagicLinkDriver {
  readonly method: string;
  send(
    target: string,
    link: string,
    feature?: VerificationFeature,
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
