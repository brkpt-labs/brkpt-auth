import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { SessionController } from './session.controller';
import { BRKPT_AUTH_SESSION_PORT, SessionPort } from './session.port';
import { SessionService } from './session.service';

export const sessionFeature = (adapter: Type<SessionPort>): FeatureConfig => ({
  controllers: [SessionController],
  providers: [
    {
      provide: BRKPT_AUTH_SESSION_PORT,
      useClass: adapter,
    } satisfies PortProvider<SessionPort>,
    SessionService,
  ],
});
