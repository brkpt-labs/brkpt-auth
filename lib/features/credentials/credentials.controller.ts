import { Body, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { type Response } from 'express';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import { Public } from '../../common/decorators/public.decorator';
import {
  type BrkptAuthModuleOptions,
  type BrkptAuthRequest,
} from '../../common/interfaces';
import { extractRequestMetadata, setRefreshToken } from '../../common/utils';
import { CredentialsService } from './credentials.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Public()
@Controller('auth')
export class CredentialsController {
  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
    private readonly credentialsService: CredentialsService,
  ) {}

  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpDto,
    @Req() req: BrkptAuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.credentialsService.signUp(
      dto,
      extractRequestMetadata(req),
    );

    return {
      accessToken,
      ...setRefreshToken(response, refreshToken, this.options),
    };
  }

  @Post('sign-in')
  async signIn(
    @Body() dto: SignInDto,
    @Req() req: BrkptAuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.credentialsService.signIn(
      dto,
      extractRequestMetadata(req),
    );

    return {
      accessToken,
      ...setRefreshToken(response, refreshToken, this.options),
    };
  }
}
