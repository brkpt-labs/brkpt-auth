import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
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
import { AuthenticateDto } from './dto/authenticate.dto';
import { SendDto } from './dto/send.dto';
import { MagicLinkService } from './magic-link.service';

@Public()
@Controller('auth/magic-link')
export class MagicLinkController {
  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
    private readonly magicLinkService: MagicLinkService,
  ) {}

  @Post('send')
  @HttpCode(200)
  async send(@Body() { target, method }: SendDto) {
    await this.magicLinkService.send(target, method);
    return 'Magic link sent successfully';
  }

  @Get('authenticate')
  async authenticate(
    @Query()
    { target, method, token }: AuthenticateDto,
    @Req() req: BrkptAuthRequest,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.magicLinkService.authenticate(
        target,
        method,
        token,
        extractRequestMetadata(req),
      );

    return {
      accessToken,
      ...setRefreshToken(response, refreshToken, this.options),
    };
  }
}
