/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import request from 'supertest';

import { createTestApp, TestContext } from './setup/create-test-app';

describe('Auth (e2e)', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  describe('Credentials', () => {
    it('should sign up and return accessToken', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/auth/sign-up')
        .send({ email: 'new@example.com', password: 'password123' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
    });

    it('should sign in and return accessToken', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'verified@example.com', password: 'password' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
    });

    it('should return 401 when password is wrong', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'verified@example.com', password: 'wrong' })
        .expect(401);
    });

    it('should return 409 when signing up with existing email', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/sign-up')
        .send({ email: 'verified@example.com', password: 'password' })
        .expect(409);
    });

    it('should access protected route with valid token', async () => {
      const { body } = await request(ctx.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'verified@example.com', password: 'password' });

      await request(ctx.app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
    });

    it('should return 401 when accessing protected route without token', async () => {
      await request(ctx.app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should blacklist token after sign out', async () => {
      const { body } = await request(ctx.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'verified@example.com', password: 'password' });

      const accessToken = body.accessToken;

      await request(ctx.app.getHttpServer())
        .post('/auth/sign-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(ctx.app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('OTP', () => {
    it('should send OTP and authenticate', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/otp/send')
        .send({ target: 'verified@example.com', method: 'email' })
        .expect(200);

      const code = ctx.otpVerifier.getLastCode();
      expect(code).toBeDefined();

      const res = await request(ctx.app.getHttpServer())
        .post('/auth/otp/authenticate')
        .send({ target: 'verified@example.com', method: 'email', code })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
    });

    it('should return 401 when OTP code is wrong', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/otp/send')
        .send({ target: 'verified@example.com', method: 'email' })
        .expect(200);

      await request(ctx.app.getHttpServer())
        .post('/auth/otp/authenticate')
        .send({
          target: 'verified@example.com',
          method: 'email',
          code: 'wrong',
        })
        .expect(401);
    });
  });

  describe('Magic Link', () => {
    it('should send magic link and authenticate', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/magic-link/send')
        .send({ target: 'verified@example.com', method: 'email' })
        .expect(200);

      const token = ctx.magicLinkVerifier.getLastToken();
      expect(token).toBeDefined();

      const res = await request(ctx.app.getHttpServer())
        .get('/auth/magic-link/authenticate')
        .query({ target: 'verified@example.com', method: 'email', token })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
    });

    it('should return 401 when magic link token is invalid', async () => {
      await request(ctx.app.getHttpServer())
        .get('/auth/magic-link/authenticate')
        .query({
          target: 'verified@example.com',
          method: 'email',
          token: 'invalid-token',
        })
        .expect(401);
    });
  });
});
