import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { MagicLinkController } from './magic-link.controller';
import {
  MagicLinkDriver,
  magicLinkDriverMapProvider,
} from './magic-link.driver';
import { BRKPT_AUTH_MAGIC_LINK_PORT, MagicLinkPort } from './magic-link.port';
import { MagicLinkService } from './magic-link.service';

export const magicLinkFeature = (
  adapter: Type<MagicLinkPort>,
  ...drivers: Type<MagicLinkDriver>[]
): FeatureConfig => ({
  controllers: [MagicLinkController],
  providers: [
    {
      provide: BRKPT_AUTH_MAGIC_LINK_PORT,
      useClass: adapter,
    } satisfies PortProvider<MagicLinkPort>,
    MagicLinkService,
    ...drivers,
    magicLinkDriverMapProvider(...drivers),
  ],
});
