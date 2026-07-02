import { Controller, Delete, Get, Param, Req } from '@nestjs/common';

import { type BrkptAuthRequest } from '../../common/interfaces';
import { extractRequestMetadata } from '../../common/utils';
import { SessionService } from './session.service';

@Controller('auth/session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getAll(@Req() req: BrkptAuthRequest) {
    return this.sessionService.getAll(req.user!);
  }

  @Delete('others')
  async revokeOthers(@Req() req: BrkptAuthRequest) {
    await this.sessionService.revokeOthers(
      req.user!,
      extractRequestMetadata(req),
    );
    return 'Other sessions revoked successfully';
  }

  @Delete(':sessionId')
  async revoke(
    @Req() req: BrkptAuthRequest,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.revoke(
      req.user!,
      sessionId,
      extractRequestMetadata(req),
    );
    return 'Session revoked successfully';
  }
}
