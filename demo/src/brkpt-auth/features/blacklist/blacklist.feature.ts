import { Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { BlacklistGuard } from './blacklist.guard';
import { BlacklistPort, BRKPT_AUTH_BLACKLIST_PORT } from './blacklist.port';
import { BlacklistService } from './blacklist.service';

export const blacklistFeature = (
  adapter: Type<BlacklistPort>,
): FeatureConfig => ({
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: BlacklistGuard },
    {
      provide: BRKPT_AUTH_BLACKLIST_PORT,
      useClass: adapter,
    } satisfies PortProvider<BlacklistPort>,
    BlacklistService,
  ],
});
