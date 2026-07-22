/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import request from 'supertest';

import { createTestApp, TestContext } from './setup/create-test-app';

describe('Password (e2e)', () => {
  let ctx: TestContext;
  let accessToken: string;

  beforeEach(async () => {
    ctx = await createTestApp();

    const { body } = await request(ctx.app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'verified@example.com', password: 'password' });

    accessToken = body.accessToken;
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  describe('Change Password', () => {
    it('should change password successfully', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'password', newPassword: 'newpassword' })
        .expect(200);

      await request(ctx.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'verified@example.com', password: 'newpassword' })
        .expect(201);
    });

    it('should return 401 when current password is wrong', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'wrong', newPassword: 'newpassword' })
        .expect(401);
    });

    it('should revoke other sessions after password change', async () => {
      const { body: secondLogin } = await request(ctx.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'verified@example.com', password: 'password' });

      const secondToken = secondLogin.accessToken;

      await request(ctx.app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'password', newPassword: 'newpassword' })
        .expect(200);

      await request(ctx.app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(401);
    });
  });

  describe('Reset Password', () => {
    it('should reset password via OTP', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/reset-password/send')
        .send({
          target: 'verified@example.com',
          strategy: 'otp',
          method: 'email',
        })
        .expect(200);

      const code = ctx.otpDriver.getLastCode();

      await request(ctx.app.getHttpServer())
        .post('/auth/reset-password/reset')
        .send({
          target: 'verified@example.com',
          strategy: 'otp',
          method: 'email',
          proof: code,
          newPassword: 'resetpassword',
        })
        .expect(200);

      await request(ctx.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'verified@example.com', password: 'resetpassword' })
        .expect(201);
    });

    it('should reset password via magic-link', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/reset-password/send')
        .send({
          target: 'verified@example.com',
          strategy: 'magic-link',
          method: 'email',
        })
        .expect(200);

      const token = ctx.magicLinkDriver.getLastToken();

      await request(ctx.app.getHttpServer())
        .post('/auth/reset-password/reset')
        .send({
          target: 'verified@example.com',
          strategy: 'magic-link',
          method: 'email',
          proof: token,
          newPassword: 'resetpassword',
        })
        .expect(200);

      await request(ctx.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'verified@example.com', password: 'resetpassword' })
        .expect(201);
    });

    it('should return 401 when user not found', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/reset-password/send')
        .send({
          target: 'notexist@example.com',
          strategy: 'otp',
          method: 'email',
        })
        .expect(401);
    });
  });
});
