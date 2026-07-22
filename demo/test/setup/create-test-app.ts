import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { AppModule } from '../../src/app.module';
import { BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP } from '../../src/brkpt-auth/features/magic-link/magic-link.driver';
import { BRKPT_AUTH_OTP_DRIVER_MAP } from '../../src/brkpt-auth/features/otp/otp.driver';
import { MemoryUserRepository } from '../../src/user/repositories/memory-user.repository';
import { MemoryRedis } from './memory-redis';
import { MockEmailMagicLinkDriver, MockEmailOtpDriver } from './mock-drivers';

export interface TestContext {
  app: INestApplication;
  redis: MemoryRedis;
  userRepo: MemoryUserRepository;
  otpDriver: MockEmailOtpDriver;
  magicLinkDriver: MockEmailMagicLinkDriver;
}

export async function createTestApp(): Promise<TestContext> {
  const redis = new MemoryRedis();
  const otpDriver = new MockEmailOtpDriver();
  const magicLinkDriver = new MockEmailMagicLinkDriver();

  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('REDIS_CLIENT')
    .useValue(redis)
    .overrideProvider(BRKPT_AUTH_OTP_DRIVER_MAP)
    .useValue(new Map([['email', otpDriver]]))
    .overrideProvider(BRKPT_AUTH_MAGIC_LINK_DRIVER_MAP)
    .useValue(new Map([['email', magicLinkDriver]]))
    .compile();

  const app = module.createNestApplication();
  app.use(cookieParser());
  await app.init();

  const userRepo = module.get(MemoryUserRepository);

  return { app, redis, userRepo, otpDriver, magicLinkDriver };
}
