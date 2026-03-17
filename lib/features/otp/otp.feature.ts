import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { OtpController } from './otp.controller';
import { BRKPT_AUTH_OTP_PORT, OtpPort } from './otp.port';
import { OtpService } from './otp.service';
import { OtpVerifier, otpVerifierMapProvider } from './otp.verifier';

export const otpFeature = (
  adapter: Type<OtpPort>,
  ...verifiers: Type<OtpVerifier>[]
): FeatureConfig => ({
  controllers: [OtpController],
  providers: [
    {
      provide: BRKPT_AUTH_OTP_PORT,
      useClass: adapter,
    } satisfies PortProvider<OtpPort>,
    OtpService,
    ...verifiers,
    otpVerifierMapProvider(...verifiers),
  ],
});
