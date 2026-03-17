import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { AppModule } from '../../src/app.module';
import { BRKPT_AUTH_MAGIC_LINK_VERIFIER_MAP } from '../../src/brkpt-auth/features/magic-link/magic-link.verifier';
import { BRKPT_AUTH_OTP_VERIFIER_MAP } from '../../src/brkpt-auth/features/otp/otp.verifier';
import { MemoryUserRepository } from '../../src/user/repositories/memory-user.repository';
import { MemoryRedis } from './memory-redis';
import {
  MockEmailMagicLinkVerifier,
  MockEmailOtpVerifier,
} from './mock-verifiers';

export interface TestContext {
  app: INestApplication;
  redis: MemoryRedis;
  userRepo: MemoryUserRepository;
  otpVerifier: MockEmailOtpVerifier;
  magicLinkVerifier: MockEmailMagicLinkVerifier;
}

export async function createTestApp(): Promise<TestContext> {
  const redis = new MemoryRedis();
  const otpVerifier = new MockEmailOtpVerifier();
  const magicLinkVerifier = new MockEmailMagicLinkVerifier();

  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('REDIS_CLIENT')
    .useValue(redis)
    .overrideProvider(BRKPT_AUTH_OTP_VERIFIER_MAP)
    .useValue(new Map([['email', otpVerifier]]))
    .overrideProvider(BRKPT_AUTH_MAGIC_LINK_VERIFIER_MAP)
    .useValue(new Map([['email', magicLinkVerifier]]))
    .compile();

  const app = module.createNestApplication();
  app.use(cookieParser());
  await app.init();

  const userRepo = module.get(MemoryUserRepository);

  return { app, redis, userRepo, otpVerifier, magicLinkVerifier };
}
