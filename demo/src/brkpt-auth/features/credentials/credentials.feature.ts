import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { CredentialsController } from './credentials.controller';
import {
  BRKPT_AUTH_CREDENTIALS_PORT,
  CredentialsPort,
} from './credentials.port';
import { CredentialsService } from './credentials.service';

export const credentialsFeature = (
  adapter: Type<CredentialsPort>,
): FeatureConfig => ({
  controllers: [CredentialsController],
  providers: [
    {
      provide: BRKPT_AUTH_CREDENTIALS_PORT,
      useClass: adapter,
    } satisfies PortProvider<CredentialsPort>,
    CredentialsService,
  ],
});
