import { Controller, Delete, Get, Param, Req } from '@nestjs/common';

import { SkipVerifyEmail } from '../../common/decorators/skip-verify-email.decorator';
import { type BrkptAuthRequest } from '../../common/interfaces';
import { SessionService } from './session.service';

// Demo only: @SkipVerifyEmail() is added here because verify-email is enabled in this demo.
// In your project, if you enable the verify-email feature, add this decorator to any route that should
// remain accessible before a user's email is verified.
@SkipVerifyEmail()
@Controller('auth/session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getAll(@Req() req: BrkptAuthRequest) {
    return this.sessionService.getAll(req.user!);
  }

  @Delete('others')
  async revokeOthers(@Req() req: BrkptAuthRequest) {
    await this.sessionService.revokeOthers(req.user!);
    return 'Other sessions revoked successfully';
  }

  @Delete(':sessionId')
  async revoke(
    @Req() req: BrkptAuthRequest,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.revoke(req.user!, sessionId);
    return 'Session revoked successfully';
  }
}
