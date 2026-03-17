import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { RequestMetadata, SignInEvent } from '../../common/interfaces';
import { CoreService } from '../core/core.service';
import { BRKPT_AUTH_OAUTH_PORT, type OAuthPort } from './oauth.port';
import { BRKPT_AUTH_OAUTH_VERIFIER_MAP, OAuthVerifier } from './oauth.verifier';

@Injectable()
export class OAuthService {
  constructor(
    @Inject(BRKPT_AUTH_OAUTH_PORT)
    private readonly port: OAuthPort,
    @Inject(BRKPT_AUTH_OAUTH_VERIFIER_MAP)
    private readonly verifiers: Map<string, OAuthVerifier>,
    private readonly coreService: CoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async authenticate(
    dto: unknown,
    provider: string,
    metadata?: RequestMetadata,
  ) {
    const verifier = this.verifiers.get(provider);
    if (!verifier) {
      throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
    }

    const raw = await verifier.verify(dto);
    const profile = this.port.mapRawToProfile(provider, raw);
    if (!profile) {
      throw new Error(
        '[brkpt-auth] mapRawToProfile returned undefined for provider: ' +
          provider,
      );
    }

    const user = await this.port.findOrCreateUserByProfile(profile);

    void this.eventEmitter.emitAsync('brkpt-auth.oauth.sign-in', {
      userId: this.port.extractUserIdFromUser(user),
      feature: 'oauth',
      timestamp: Date.now(),
      metadata,
    } satisfies SignInEvent);

    return this.coreService.generateTokens(user, metadata);
  }
}
