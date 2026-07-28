import { Inject, Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

import {
  BRKPT_AUTH_MODULE_OPTIONS,
  VERIFICATION_PURPOSE_LABELS,
} from '../../../common/constants';
import {
  type BrkptAuthModuleOptions,
  VerificationPurpose,
} from '../../../common/interfaces';
import { MagicLinkDriver } from '../magic-link.driver';

@Injectable()
export class EmailMagicLinkDriver implements MagicLinkDriver {
  readonly method = 'email';
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    options: BrkptAuthModuleOptions,
  ) {
    const cfg = options.magicLink?.emailClient;
    if (!cfg) {
      throw new Error(
        '[brkpt-auth] EmailMagicLinkDriver requires options.magicLink.emailClient to be configured.',
      );
    }
    this.from = cfg.from;
    this.transporter = createTransport({
      host: cfg.host,
      port: cfg.port,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });
  }

  async send(
    target: string,
    link: string,
    purpose: VerificationPurpose,
  ): Promise<void> {
    const subject = `Your magic link to ${VERIFICATION_PURPOSE_LABELS[purpose]}`;

    await this.transporter.sendMail({
      from: this.from,
      to: target,
      subject,
      text: `Click the link to continue: ${link}`,
      html: `<a href="${link}">Click here to continue</a>`,
    });
  }
}
