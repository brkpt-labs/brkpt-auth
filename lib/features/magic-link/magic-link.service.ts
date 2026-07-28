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
  VerificationPurpose,
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

  async send(
    target: string,
    method: string,
    purpose: VerificationPurpose = 'authenticate',
  ) {
    const driver = this.drivers.get(method);
    if (!driver) {
      throw new BadRequestException(`Unsupported magic link method: ${method}`);
    }

    const callbackUrl = this.options.magicLink!.callbackUrls[purpose];

    const token = randomUUID();
    const link = `${callbackUrl}?token=${encodeURIComponent(token)}`;

    await driver.send(target, link, purpose);
    await this.port.saveToken(
      token,
      { target, method, purpose },
      parseDurationToMs(this.options.magicLink!.expiresIn),
    );
  }

  async authenticate(token: string, metadata?: RequestMetadata) {
    const data = await this.port.getTokenData(token);
    if (!data || data.purpose !== 'authenticate') {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    await this.port.deleteToken(token);

    const profile = this.port.mapTargetToProfile(data.method, data.target);
    if (!profile) {
      throw new Error(
        '[brkpt-auth] mapTargetToProfile returned undefined for method: ' +
          data.method,
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
    purpose,
  }: VerificationSendEvent) {
    if (strategy !== 'magic-link') {
      return;
    }
    await this.send(target, method, purpose);
    return true;
  }

  @OnEvent('brkpt-auth.verification.verify', { suppressErrors: false })
  async handleVerificationVerify({
    target,
    strategy,
    method,
    purpose,
    proof,
  }: VerificationVerifyEvent) {
    if (strategy !== 'magic-link') {
      return;
    }

    const data = await this.port.getTokenData(proof);
    if (
      !data ||
      data.target !== target ||
      data.method !== method ||
      data.purpose !== purpose
    ) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    await this.port.deleteToken(proof);
    return true;
  }
}
