import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { BrkptAuthRequest } from '../../../common/interfaces';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
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
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Invalid access token');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<Record<string, unknown>>(token);

      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    return true;
  }

  private extractToken(request: BrkptAuthRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
