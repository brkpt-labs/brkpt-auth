import { Type } from '@nestjs/common';

import { FeatureConfig, PortProvider } from '../../common/interfaces';
import { AuditPort, BRKPT_AUTH_AUDIT_PORT } from './audit.port';
import { AuditService } from './audit.service';

export const auditFeature = (adapter: Type<AuditPort>): FeatureConfig => ({
  controllers: [],
  providers: [
    {
      provide: BRKPT_AUTH_AUDIT_PORT,
      useClass: adapter,
    } satisfies PortProvider<AuditPort>,
    AuditService,
  ],
});
