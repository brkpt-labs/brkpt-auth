import {
  Body,
  Controller,
  HttpCode,
  Inject,
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
import { AuthenticateDto } from './dto/authenticate.dto';
import { SendDto } from './dto/send.dto';
import { OtpService } from './otp.service';

@Public()
@Controller('auth/otp')
export class OtpController {
  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
    private readonly otpService: OtpService,
  ) {}

  @Post('send')
  @HttpCode(200)
  async send(@Body() { target, method }: SendDto) {
    await this.otpService.send(target, method);
    return 'OTP sent successfully';
  }

  @Post('authenticate')
  async authenticate(
    @Body()
    { target, method, code }: AuthenticateDto,
    @Req() req: BrkptAuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.otpService.authenticate(
      target,
      method,
      code,
      extractRequestMetadata(req),
    );

    return {
      accessToken,
      ...setRefreshToken(response, refreshToken, this.options),
    };
  }
}
