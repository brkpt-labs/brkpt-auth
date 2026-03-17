/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import request from 'supertest';

import { createTestApp, TestContext } from './setup/create-test-app';

describe('Session (e2e)', () => {
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

  it('should return session list', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('should revoke a specific session', async () => {
    const { body: sessions } = await request(ctx.app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', `Bearer ${accessToken}`);

    const sessionId = sessions[0].sessionId;

    await request(ctx.app.getHttpServer())
      .delete(`/auth/session/${sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  it('should return 403 when revoking another user session', async () => {
    const { body: otherUser } = await request(ctx.app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'other@example.com', password: 'password' });

    const { body: otherSessions } = await request(ctx.app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', `Bearer ${otherUser.accessToken}`);

    const otherSessionId = otherSessions[0].sessionId;

    await request(ctx.app.getHttpServer())
      .delete(`/auth/session/${otherSessionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('should revoke all other sessions', async () => {
    const { body: secondLogin } = await request(ctx.app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'verified@example.com', password: 'password' });

    const secondToken = secondLogin.accessToken;

    await request(ctx.app.getHttpServer())
      .delete('/auth/session/others')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(401);

    await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
