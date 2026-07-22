import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../../common/constants';
import { type BrkptAuthModuleOptions } from '../../../common/interfaces';
import { OAuthDriver } from '../oauth.driver';

@Injectable()
export class GoogleOAuthDriver implements OAuthDriver {
  readonly provider = 'google';
  private readonly client: OAuth2Client;

  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    options: BrkptAuthModuleOptions,
  ) {
    const cfg = options.oauth?.google;
    if (!cfg) {
      throw new Error(
        '[brkpt-auth] GoogleOAuthDriver requires options.oauth.google to be configured.',
      );
    }
    this.client = new OAuth2Client(cfg.clientId, cfg.clientSecret);
  }

  async verify({ idToken }: { idToken: string }): Promise<unknown> {
    let ticket;
    try {
      ticket = await this.client.verifyIdToken({ idToken });
    } catch {
      throw new UnauthorizedException('Invalid or expired Google OAuth token');
    }
    const p = ticket.getPayload();
    if (!p) {
      throw new UnauthorizedException('Malformed Google token payload');
    }

    return p;
  }
}
