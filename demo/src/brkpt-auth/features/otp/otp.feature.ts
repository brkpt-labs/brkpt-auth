import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { OtpController } from './otp.controller';
import { OtpDriver, otpDriverMapProvider } from './otp.driver';
import { BRKPT_AUTH_OTP_PORT, OtpPort } from './otp.port';
import { OtpService } from './otp.service';

export const otpFeature = (
  adapter: Type<OtpPort>,
  ...drivers: Type<OtpDriver>[]
): FeatureConfig => ({
  controllers: [OtpController],
  providers: [
    {
      provide: BRKPT_AUTH_OTP_PORT,
      useClass: adapter,
    } satisfies PortProvider<OtpPort>,
    OtpService,
    ...drivers,
    otpDriverMapProvider(...drivers),
  ],
});
