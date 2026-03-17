/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import request from 'supertest';

import { createTestApp, TestContext } from './setup/create-test-app';

describe('Email Verification (e2e)', () => {
  let ctx: TestContext;
  let accessToken: string;

  beforeEach(async () => {
    ctx = await createTestApp();

    const { body } = await request(ctx.app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'test@example.com', password: 'password' });

    accessToken = body.accessToken;
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  it('should block unverified user from protected routes', async () => {
    await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('should allow access to verify-email routes without verification', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/verify-email/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ target: 'test@example.com', strategy: 'otp' })
      .expect(200);
  });

  it('should verify email via OTP and allow access', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/verify-email/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ target: 'test@example.com', strategy: 'otp' });

    const code = ctx.otpVerifier.getLastCode();

    await request(ctx.app.getHttpServer())
      .post('/auth/verify-email/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ target: 'test@example.com', strategy: 'otp', proof: code })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('should verify email via magic-link and allow access', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/verify-email/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ target: 'test@example.com', strategy: 'magic-link' });

    const token = ctx.magicLinkVerifier.getLastToken();

    await request(ctx.app.getHttpServer())
      .post('/auth/verify-email/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        target: 'test@example.com',
        strategy: 'magic-link',
        proof: token,
      })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('should return 400 when using unsupported strategy', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/verify-email/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ target: 'test@example.com', strategy: 'unsupported' })
      .expect(400);
  });
});
