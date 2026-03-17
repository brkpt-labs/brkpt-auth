import { Inject, Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

import {
  BRKPT_AUTH_MODULE_OPTIONS,
  VERIFICATION_FEATURE_SUBJECTS,
} from '../../../common/constants';
import {
  type BrkptAuthModuleOptions,
  VerificationFeature,
} from '../../../common/interfaces';
import { OtpVerifier } from '../otp.verifier';

@Injectable()
export class EmailOtpVerifier implements OtpVerifier {
  readonly method = 'email';
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    @Inject(BRKPT_AUTH_MODULE_OPTIONS)
    options: BrkptAuthModuleOptions,
  ) {
    const cfg = options.otp?.emailClient;
    if (!cfg) {
      throw new Error(
        '[brkpt-auth] EmailOtpVerifier requires options.otp.emailClient to be configured.',
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
    code: string,
    feature?: VerificationFeature,
  ): Promise<void> {
    const subject = feature
      ? VERIFICATION_FEATURE_SUBJECTS[feature]
      : 'Your OTP code';

    await this.transporter.sendMail({
      from: this.from,
      to: target,
      subject,
      text: `Your OTP code is: ${code}`,
    });
  }
}
