import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { ChangePasswordController } from './change-password.controller';
import {
  BRKPT_AUTH_CHANGE_PASSWORD_PORT,
  ChangePasswordPort,
} from './change-password.port';
import { ChangePasswordService } from './change-password.service';

export const changePasswordFeature = (
  adapter: Type<ChangePasswordPort>,
): FeatureConfig => ({
  controllers: [ChangePasswordController],
  providers: [
    {
      provide: BRKPT_AUTH_CHANGE_PASSWORD_PORT,
      useClass: adapter,
    } satisfies PortProvider<ChangePasswordPort>,
    ChangePasswordService,
  ],
});
