import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';

import { type BrkptAuthRequest } from '../../common/interfaces';
import { extractRequestMetadata } from '../../common/utils';
import { ChangePasswordService } from './change-password.service';
import { ChangeDto } from './dto/change.dto';

@Controller('auth/change-password')
export class ChangePasswordController {
  constructor(private readonly changePasswordService: ChangePasswordService) {}

  @Post()
  @HttpCode(200)
  async change(
    @Body() { currentPassword, newPassword }: ChangeDto,
    @Req() req: BrkptAuthRequest,
  ) {
    await this.changePasswordService.change(
      req.user!,
      currentPassword,
      newPassword,
      extractRequestMetadata(req),
    );
    return 'Password changed successfully';
  }
}
