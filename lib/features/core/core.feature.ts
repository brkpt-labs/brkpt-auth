import { Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { CoreController } from './core.controller';
import { BRKPT_AUTH_CORE_PORT, CorePort } from './core.port';
import { CoreService } from './core.service';
import { JwtGuard } from './guards/jwt.guard';

export const coreFeature = (adapter: Type<CorePort>): FeatureConfig => ({
  controllers: [CoreController],
  providers: [
    { provide: APP_GUARD, useClass: JwtGuard },
    {
      provide: BRKPT_AUTH_CORE_PORT,
      useClass: adapter,
    } satisfies PortProvider<CorePort>,
    CoreService,
  ],
});
