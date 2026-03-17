import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { OAuthController } from './oauth.controller';
import { BRKPT_AUTH_OAUTH_PORT, OAuthPort } from './oauth.port';
import { OAuthService } from './oauth.service';
import { OAuthVerifier, oauthVerifierMapProvider } from './oauth.verifier';

export const oauthFeature = (
  adapter: Type<OAuthPort>,
  ...verifiers: Type<OAuthVerifier>[]
): FeatureConfig => ({
  controllers: [OAuthController],
  providers: [
    {
      provide: BRKPT_AUTH_OAUTH_PORT,
      useClass: adapter,
    } satisfies PortProvider<OAuthPort>,
    OAuthService,
    ...verifiers,
    oauthVerifierMapProvider(...verifiers),
  ],
});
