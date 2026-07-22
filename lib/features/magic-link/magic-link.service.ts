import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import {
  type BrkptAuthModuleOptions,
  RequestMetadata,
  SignInEvent,
  SignUpEvent,
  VerificationFeature,
  type VerificationSendEvent,
  type VerificationVerifyEvent,
} from '../../common/interfaces';
import { parseDurationToMs } from '../../common/utils';
import { CoreService } from '../core/core.service';
import {
  BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP,
  MagicLinkDriver,
} from './magic-link.driver';
import {
  BRKPT_AUTH_MAGIC_LINK_PORT,
  type MagicLinkPort,
} from './magic-link.port';

@Injectable()
export class MagicLinkService {
  constructor(
    @Inject(BRKPT_AUTH_MAGIC_LINK_PORT)
    private readonly port: MagicLinkPort,
    @Inject(BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP)
    private readonly drivers: Map<string, MagicLinkDriver>,
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
    private readonly coreService: CoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    if (!options.magicLink) {
      throw new Error(
        '[brkpt-auth] MagicLinkService requires options.magicLink to be configured.',
      );
    }
  }

  async send(target: string, method: string, feature?: VerificationFeature) {
    const driver = this.drivers.get(method);
    if (!driver) {
      throw new BadRequestException(`Unsupported magic link method: ${method}`);
    }

    const callbackUrls = this.options.magicLink!.callbackUrls;
    const callbackUrl =
      (feature &&
        (callbackUrls as Record<string, string | undefined>)[feature]) ??
      callbackUrls.authenticate;

    const token = randomUUID();
    const link = `${callbackUrl}?target=${encodeURIComponent(target)}&method=${method}&token=${token}`;

    await driver.send(target, link, feature);
    await this.port.saveToken(
      target,
      token,
      parseDurationToMs(this.options.magicLink!.expiresIn),
    );
  }

  async authenticate(
    target: string,
    method: string,
    token: string,
    metadata?: RequestMetadata,
  ) {
    const savedTarget = await this.port.getToken(token);
    if (!savedTarget || savedTarget !== target) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    await this.port.deleteToken(token);

    const profile = this.port.mapTargetToProfile(method, target);
    if (!profile) {
      throw new Error(
        '[brkpt-auth] mapTargetToProfile returned undefined for method: ' +
          method,
      );
    }

    const { user, created } =
      await this.port.findOrCreateUserByProfile(profile);

    if (created) {
      void this.eventEmitter.emitAsync('brkpt-auth.magic-link.sign-up', {
        userId: this.port.extractUserIdFromUser(user),
        feature: 'magic-link',
        timestamp: Date.now(),
        metadata,
      } satisfies SignUpEvent);
    }

    void this.eventEmitter.emitAsync('brkpt-auth.magic-link.sign-in', {
      userId: this.port.extractUserIdFromUser(user),
      feature: 'magic-link',
      timestamp: Date.now(),
      metadata,
    } satisfies SignInEvent);

    return this.coreService.generateTokens(user, metadata);
  }

  @OnEvent('brkpt-auth.verification.send', {
    suppressErrors: false,
  })
  async handleVerificationSend({
    target,
    strategy,
    method,
    feature,
  }: VerificationSendEvent) {
    if (strategy !== 'magic-link') {
      return;
    }
    await this.send(target, method, feature);
    return true;
  }

  @OnEvent('brkpt-auth.verification.verify', { suppressErrors: false })
  async handleVerificationVerify({
    target,
    strategy,
    proof,
  }: VerificationVerifyEvent) {
    if (strategy !== 'magic-link') {
      return;
    }

    const savedTarget = await this.port.getToken(proof);
    if (!savedTarget || savedTarget !== target) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    await this.port.deleteToken(proof);
    return true;
  }
}
