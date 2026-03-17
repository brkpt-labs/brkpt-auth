import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';

import { SkipVerifyEmail } from '../../common/decorators/skip-verify-email.decorator';
import { type BrkptAuthRequest } from '../../common/interfaces';
import { extractRequestMetadata } from '../../common/utils';
import { SendDto } from './dto/send.dto';
import { VerifyDto } from './dto/verify.dto';
import { VerifyEmailService } from './verify-email.service';

@SkipVerifyEmail()
@Controller('auth/verify-email')
export class VerifyEmailController {
  constructor(private readonly verifyEmailService: VerifyEmailService) {}

  @Post('send')
  @HttpCode(200)
  async send(@Body() { target, strategy }: SendDto) {
    await this.verifyEmailService.send(target, strategy);
    return 'Verification email sent successfully';
  }

  @Post('verify')
  @HttpCode(200)
  async verify(
    @Body() { target, strategy, proof }: VerifyDto,
    @Req() req: BrkptAuthRequest,
  ) {
    await this.verifyEmailService.verify(
      req.user!,
      target,
      strategy,
      proof,
      extractRequestMetadata(req),
    );
    return 'Email verified successfully';
  }
}
