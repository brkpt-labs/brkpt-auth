import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { OAuthController } from './oauth.controller';
import { OAuthDriver, oauthDriverMapProvider } from './oauth.driver';
import { BRKPT_AUTH_OAUTH_PORT, OAuthPort } from './oauth.port';
import { OAuthService } from './oauth.service';

export const oauthFeature = (
  adapter: Type<OAuthPort>,
  ...drivers: Type<OAuthDriver>[]
): FeatureConfig => ({
  controllers: [OAuthController],
  providers: [
    {
      provide: BRKPT_AUTH_OAUTH_PORT,
      useClass: adapter,
    } satisfies PortProvider<OAuthPort>,
    OAuthService,
    ...drivers,
    oauthDriverMapProvider(...drivers),
  ],
});
