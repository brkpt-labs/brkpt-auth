import { Type } from '@nestjs/common';

import { VerificationFeature } from '../../common/interfaces';

export const BRKPT_AUTH_OTP_VERIFIER_MAP = Symbol(
  'BRKPT_AUTH_OTP_VERIFIER_MAP',
);

export interface OtpVerifier {
  readonly method: string;
  send(
    target: string,
    code: string,
    feature?: VerificationFeature,
  ): Promise<void>;
}

export const otpVerifierMapProvider = (
  ...verifierClasses: Type<OtpVerifier>[]
) => ({
  provide: BRKPT_AUTH_OTP_VERIFIER_MAP,
  useFactory: (...verifiers: OtpVerifier[]): Map<string, OtpVerifier> =>
    new Map(verifiers.map((v) => [v.method, v])),
  inject: verifierClasses,
});
