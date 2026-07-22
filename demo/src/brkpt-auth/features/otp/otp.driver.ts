import { Type } from '@nestjs/common';

import { VerificationFeature } from '../../common/interfaces';

export const BRKPT_AUTH_OTP_DRIVER_MAP = Symbol('BRKPT_AUTH_OTP_DRIVER_MAP');

export interface OtpDriver {
  readonly method: string;
  send(
    target: string,
    code: string,
    feature?: VerificationFeature,
  ): Promise<void>;
}

export const otpDriverMapProvider = (...driverClasses: Type<OtpDriver>[]) => ({
  provide: BRKPT_AUTH_OTP_DRIVER_MAP,
  useFactory: (...drivers: OtpDriver[]): Map<string, OtpDriver> =>
    new Map(drivers.map((d) => [d.method, d])),
  inject: driverClasses,
});
