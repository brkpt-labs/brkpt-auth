import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { ResetPasswordController } from './reset-password.controller';
import {
  BRKPT_AUTH_RESET_PASSWORD_PORT,
  ResetPasswordPort,
} from './reset-password.port';
import { ResetPasswordService } from './reset-password.service';

export const resetPasswordFeature = (
  adapter: Type<ResetPasswordPort>,
): FeatureConfig => ({
  controllers: [ResetPasswordController],
  providers: [
    {
      provide: BRKPT_AUTH_RESET_PASSWORD_PORT,
      useClass: adapter,
    } satisfies PortProvider<ResetPasswordPort>,
    ResetPasswordService,
  ],
});
