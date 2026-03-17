import { SetMetadata } from '@nestjs/common';

export const IS_VERIFY_EMAIL_EXEMPT_KEY = 'IS_VERIFY_EMAIL_EXEMPT_KEY';
export const SkipVerifyEmail = () =>
  SetMetadata(IS_VERIFY_EMAIL_EXEMPT_KEY, true);
