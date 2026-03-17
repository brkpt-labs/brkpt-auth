import { Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { VerifyEmailController } from './verify-email.controller';
import { VerifyEmailGuard } from './verify-email.guard';
import {
  BRKPT_AUTH_VERIFY_EMAIL_PORT,
  VerifyEmailPort,
} from './verify-email.port';
import { VerifyEmailService } from './verify-email.service';

export const verifyEmailFeature = (
  adapter: Type<VerifyEmailPort>,
): FeatureConfig => ({
  controllers: [VerifyEmailController],
  providers: [
    { provide: APP_GUARD, useClass: VerifyEmailGuard },
    {
      provide: BRKPT_AUTH_VERIFY_EMAIL_PORT,
      useClass: adapter,
    } satisfies PortProvider<VerifyEmailPort>,
    VerifyEmailService,
  ],
});
