import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { BrkptAuthRequest } from '../../common/interfaces';
import {
  type BlacklistPort,
  BRKPT_AUTH_BLACKLIST_PORT,
} from './blacklist.port';

@Injectable()
export class BlacklistGuard implements CanActivate {
  constructor(
    @Inject(BRKPT_AUTH_BLACKLIST_PORT)
    private readonly port: BlacklistPort,
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

    const request = context.switchToHttp().getRequest<BrkptAuthRequest>();
    const sessionId = request.user?.sid as string | undefined;
    if (!sessionId || (await this.port.exists(sessionId))) {
      throw new UnauthorizedException('Invalid access token');
    }

    return true;
  }
}
