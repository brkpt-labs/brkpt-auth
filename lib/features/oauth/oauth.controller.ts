import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { type Response } from 'express';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import { Public } from '../../common/decorators/public.decorator';
import {
  type BrkptAuthModuleOptions,
  type BrkptAuthRequest,
} from '../../common/interfaces';
import { extractRequestMetadata, setRefreshToken } from '../../common/utils';
import { OAuthDto } from './dto/oauth.dto';
import { OAuthService } from './oauth.service';

@Public()
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
    private readonly oauthService: OAuthService,
  ) {}

  @Post(':provider')
  async authenticate(
    @Param('provider') provider: string,
    @Body() dto: OAuthDto,
    @Req() req: BrkptAuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.oauthService.authenticate(
      dto,
      provider,
      extractRequestMetadata(req),
    );

    return {
      accessToken,
      ...setRefreshToken(response, refreshToken, this.options),
    };
  }
}
