import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { IS_VERIFY_EMAIL_EXEMPT_KEY } from '../../common/decorators/skip-verify-email.decorator';
import { type BrkptAuthRequest } from '../../common/interfaces';
import {
  BRKPT_AUTH_VERIFY_EMAIL_PORT,
  type VerifyEmailPort,
} from './verify-email.port';

@Injectable()
export class VerifyEmailGuard implements CanActivate {
  constructor(
    @Inject(BRKPT_AUTH_VERIFY_EMAIL_PORT)
    private readonly port: VerifyEmailPort,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isExempt = this.reflector.getAllAndOverride<boolean>(
      IS_VERIFY_EMAIL_EXEMPT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isExempt) {
      return true;
    }

    const request = context.switchToHttp().getRequest<BrkptAuthRequest>();
    const verified = await this.port.isVerified(request.user!);
    if (!verified) {
      throw new ForbiddenException(
        'Your account email has not been verified. Please verify your email to continue.',
      );
    }

    return true;
  }
}
