import { FeatureConfig } from './common/interfaces';
import { AuditAdapter } from './examples/adapters/audit.adapter';
import { BlacklistAdapter } from './examples/adapters/blacklist.adapter';
import { ChangePasswordAdapter } from './examples/adapters/change-password.adapter';
import { CoreAdapter } from './examples/adapters/core.adapter';
import { CredentialsAdapter } from './examples/adapters/credentials.adapter';
import { MagicLinkAdapter } from './examples/adapters/magic-link.adapter';
import { OAuthAdapter } from './examples/adapters/oauth.adapter';
import { OtpAdapter } from './examples/adapters/otp.adapter';
import { ResetPasswordAdapter } from './examples/adapters/reset-password.adapter';
import { SessionAdapter } from './examples/adapters/session.adapter';
import { VerifyEmailAdapter } from './examples/adapters/verify-email.adapter';
import { auditFeature } from './features/audit/audit.feature';
import { blacklistFeature } from './features/blacklist/blacklist.feature';
import { changePasswordFeature } from './features/change-password/change-password.feature';
import { coreFeature } from './features/core/core.feature';
import { credentialsFeature } from './features/credentials/credentials.feature';
import { EmailMagicLinkDriver } from './features/magic-link/drivers/email.driver';
import { magicLinkFeature } from './features/magic-link/magic-link.feature';
import { GithubOAuthDriver } from './features/oauth/drivers/github.driver';
import { GoogleOAuthDriver } from './features/oauth/drivers/google.driver';
import { oauthFeature } from './features/oauth/oauth.feature';
import { EmailOtpDriver } from './features/otp/drivers/email.driver';
import { otpFeature } from './features/otp/otp.feature';
import { resetPasswordFeature } from './features/reset-password/reset-password.feature';
import { sessionFeature } from './features/session/session.feature';
import { verifyEmailFeature } from './features/verify-email/verify-email.feature';

export const features: FeatureConfig[] = [
  coreFeature(CoreAdapter),
  credentialsFeature(CredentialsAdapter),
  sessionFeature(SessionAdapter),
  blacklistFeature(BlacklistAdapter),
  oauthFeature(OAuthAdapter, GoogleOAuthDriver, GithubOAuthDriver),
  otpFeature(OtpAdapter, EmailOtpDriver),
  verifyEmailFeature(VerifyEmailAdapter),
  magicLinkFeature(MagicLinkAdapter, EmailMagicLinkDriver),
  changePasswordFeature(ChangePasswordAdapter),
  resetPasswordFeature(ResetPasswordAdapter),
  auditFeature(AuditAdapter),
];
