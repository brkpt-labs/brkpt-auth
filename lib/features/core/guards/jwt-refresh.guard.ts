import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../../common/constants';
import {
  type BrkptAuthModuleOptions,
  BrkptAuthRequest,
} from '../../../common/interfaces';

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<BrkptAuthRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(token, {
        secret: this.options.jwt.refresh.secret,
      });

      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return true;
  }

  private extractToken(request: BrkptAuthRequest): string | undefined {
    switch (this.options.jwt.refresh.transport) {
      case 'cookie':
        return request.cookies?.['refreshToken'];
      case 'body':
        return (request.body as { refreshToken?: string } | undefined)
          ?.refreshToken;
    }
  }
}
