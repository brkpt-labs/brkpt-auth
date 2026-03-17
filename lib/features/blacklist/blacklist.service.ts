import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../common/constants';
import {
  type BrkptAuthModuleOptions,
  type SessionRevokeEvent,
} from '../../common/interfaces';
import { parseDurationToMs } from '../../common/utils';
import {
  type BlacklistPort,
  BRKPT_AUTH_BLACKLIST_PORT,
} from './blacklist.port';

@Injectable()
export class BlacklistService {
  constructor(
    @Inject(BRKPT_AUTH_BLACKLIST_PORT)
    private readonly port: BlacklistPort,
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    private readonly options: BrkptAuthModuleOptions,
  ) {}

  @OnEvent('brkpt-auth.session.revoke', { suppressErrors: false })
  async handleSessionRevoke({ sessionId }: SessionRevokeEvent) {
    await this.port.add(
      sessionId,
      parseDurationToMs(this.options.jwt.access.expiresIn),
    );
  }
}
