import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { MagicLinkController } from './magic-link.controller';
import { BRKPT_AUTH_MAGIC_LINK_PORT, MagicLinkPort } from './magic-link.port';
import { MagicLinkService } from './magic-link.service';
import {
  MagicLinkVerifier,
  magicLinkVerifierMapProvider,
} from './magic-link.verifier';

export const magicLinkFeature = (
  adapter: Type<MagicLinkPort>,
  ...verifiers: Type<MagicLinkVerifier>[]
): FeatureConfig => ({
  controllers: [MagicLinkController],
  providers: [
    {
      provide: BRKPT_AUTH_MAGIC_LINK_PORT,
      useClass: adapter,
    } satisfies PortProvider<MagicLinkPort>,
    MagicLinkService,
    ...verifiers,
    magicLinkVerifierMapProvider(...verifiers),
  ],
});
