import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { type Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { SkipVerifyEmail } from '../../common/decorators/skip-verify-email.decorator';
import { type BrkptAuthRequest } from '../../common/interfaces';
import { clearRefreshToken, extractRequestMetadata } from '../../common/utils';
import { CoreService } from './core.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() req: BrkptAuthRequest) {
    return this.coreService.refresh(req.user!, extractRequestMetadata(req));
  }

  @Get('me')
  me(@Req() req: BrkptAuthRequest) {
    return this.coreService.me(req.user!);
  }

  // Demo only: @SkipVerifyEmail() is added here because verify-email is enabled in this demo.
  // In your project, if you enable the verify-email feature, add this decorator to any route that should
  // remain accessible before a user's email is verified.
  @SkipVerifyEmail()
  @Post('sign-out')
  @HttpCode(200)
  async signOut(
    @Req() req: BrkptAuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.coreService.signOut(req.user!, extractRequestMetadata(req));

    clearRefreshToken(response);

    return 'Signed out successfully';
  }
}
