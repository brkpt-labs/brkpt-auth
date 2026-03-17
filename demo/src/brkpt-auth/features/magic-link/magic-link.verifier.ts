import { Type } from '@nestjs/common';

import { VerificationFeature } from '../../common/interfaces';

export const BRKPT_AUTH_MAGIC_LINK_VERIFIER_MAP = Symbol(
  'BRKPT_AUTH_MAGIC_LINK_VERIFIER_MAP',
);

export interface MagicLinkVerifier {
  readonly method: string;
  send(
    target: string,
    link: string,
    feature?: VerificationFeature,
  ): Promise<void>;
}

export const magicLinkVerifierMapProvider = (
  ...verifierClasses: Type<MagicLinkVerifier>[]
) => ({
  provide: BRKPT_AUTH_MAGIC_LINK_VERIFIER_MAP,
  useFactory: (
    ...verifiers: MagicLinkVerifier[]
  ): Map<string, MagicLinkVerifier> =>
    new Map(verifiers.map((v) => [v.method, v])),
  inject: verifierClasses,
});
