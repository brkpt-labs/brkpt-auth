import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { BRKPT_AUTH_MODULE_OPTIONS } from '../../../common/constants';
import { type BrkptAuthModuleOptions } from '../../../common/interfaces';
import { OAuthVerifier } from '../oauth.verifier';

interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

@Injectable()
export class GithubOAuthVerifier implements OAuthVerifier {
  readonly provider = 'github';
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    options: BrkptAuthModuleOptions,
  ) {
    const cfg = options.oauth?.github;
    if (!cfg) {
      throw new Error(
        '[brkpt-auth] GithubOAuthVerifier requires options.oauth.github to be configured.',
      );
    }
    this.clientId = cfg.clientId;
    this.clientSecret = cfg.clientSecret;
  }

  async verify({ code }: { code: string }): Promise<unknown> {
    // 1. code → access_token
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
        }),
      },
    );

    const tokenData = (await tokenRes.json()) as GithubTokenResponse & {
      error?: string;
    };
    if (tokenData.error) {
      throw new UnauthorizedException(
        `GitHub OAuth token exchange failed: ${tokenData.error}`,
      );
    }

    // 2. access_token → user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!userRes.ok) {
      throw new UnauthorizedException('Failed to fetch GitHub user info');
    }

    return userRes.json();
  }
}
