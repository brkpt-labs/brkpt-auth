import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

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
import { BRKPT_AUTH_OTP_PORT, type OtpPort } from './otp.port';
import { BRKPT_AUTH_OTP_VERIFIER_MAP, OtpVerifier } from './otp.verifier';

@Injectable()
export class OtpService {
  constructor(
    @Inject(BRKPT_AUTH_OTP_PORT)
    private readonly port: OtpPort,
    @Inject(BRKPT_AUTH_OTP_VERIFIER_MAP)
    private readonly verifiers: Map<string, OtpVerifier>,
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
    private readonly coreService: CoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    if (!options.otp) {
      throw new Error(
        '[brkpt-auth] OtpService requires options.otp to be configured.',
      );
    }
  }

  private generateCode() {
    const length = this.options.otp!.codeLength;
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  async send(target: string, method: string, feature?: VerificationFeature) {
    const verifier = this.verifiers.get(method);
    if (!verifier) {
      throw new BadRequestException(`Unsupported OTP method: ${method}`);
    }

    const code = this.generateCode();

    await verifier.send(target, code, feature);
    await this.port.saveCode(
      target,
      code,
      parseDurationToMs(this.options.otp!.expiresIn),
    );
  }

  async authenticate(
    target: string,
    method: string,
    code: string,
    metadata?: RequestMetadata,
  ) {
    const savedCode = await this.port.getCode(target);
    if (!savedCode || savedCode !== code) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    await this.port.deleteCode(target);

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
      void this.eventEmitter.emitAsync('brkpt-auth.otp.sign-up', {
        userId: this.port.extractUserIdFromUser(user),
        feature: 'otp',
        timestamp: Date.now(),
        metadata,
      } satisfies SignUpEvent);
    }

    void this.eventEmitter.emitAsync('brkpt-auth.otp.sign-in', {
      userId: this.port.extractUserIdFromUser(user),
      feature: 'otp',
      timestamp: Date.now(),
      metadata,
    } satisfies SignInEvent);

    return this.coreService.generateTokens(user, metadata);
  }

  @OnEvent('brkpt-auth.verification.send', { suppressErrors: false })
  async handleVerificationSend({
    target,
    strategy,
    method,
    feature,
  }: VerificationSendEvent) {
    if (strategy !== 'otp') {
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
    if (strategy !== 'otp') {
      return;
    }

    const savedCode = await this.port.getCode(target);
    if (!savedCode || savedCode !== proof) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    await this.port.deleteCode(target);
    return true;
  }
}
