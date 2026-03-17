import { Type } from '@nestjs/common';

export const BRKPT_AUTH_OAUTH_VERIFIER_MAP = Symbol(
  'BRKPT_AUTH_OAUTH_VERIFIER_MAP',
);

export interface OAuthVerifier {
  readonly provider: string;
  verify(dto: unknown): Promise<unknown>;
}

export const oauthVerifierMapProvider = (
  ...verifierClasses: Type<OAuthVerifier>[]
) => ({
  provide: BRKPT_AUTH_OAUTH_VERIFIER_MAP,
  useFactory: (...verifiers: OAuthVerifier[]): Map<string, OAuthVerifier> =>
    new Map(verifiers.map((v) => [v.provider, v])),
  inject: verifierClasses,
});
