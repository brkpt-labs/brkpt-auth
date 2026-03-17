import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';
import { type BrkptAuthRequest } from '../../common/interfaces';
import { extractRequestMetadata } from '../../common/utils';
import { ResetDto } from './dto/reset.dto';
import { SendDto } from './dto/send.dto';
import { ResetPasswordService } from './reset-password.service';

@Public()
@Controller('auth/reset-password')
export class ResetPasswordController {
  constructor(private readonly resetPasswordService: ResetPasswordService) {}

  @Post('send')
  @HttpCode(200)
  async send(@Body() { target, strategy, method }: SendDto) {
    await this.resetPasswordService.send(target, strategy, method);
    return 'Verification sent successfully';
  }

  @Post('reset')
  @HttpCode(200)
  async reset(
    @Body() { target, strategy, method, proof, newPassword }: ResetDto,
    @Req() req: BrkptAuthRequest,
  ) {
    await this.resetPasswordService.reset(
      target,
      strategy,
      method,
      proof,
      newPassword,
      extractRequestMetadata(req),
    );
    return 'Password reset successfully';
  }
}
