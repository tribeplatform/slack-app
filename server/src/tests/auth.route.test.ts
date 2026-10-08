jest.mock('@/config', () => ({
  CLIENT_SECRET: 'test-client-secret',
  GRAPHQL_URL: 'https://api.bettermode.test/graphql',
  SERVER_URL: 'https://slack-app.test',
  SLACK_CLIENT_ID: 'slack-client-id',
  SLACK_CLIENT_SECRET: 'slack-client-secret',
}));

import express from 'express';
import request from 'supertest';
import AuthRoute from '@routes/auth.route';
import passportMiddleware from '@middlewares/passport.middleware';
import { signConnectToken, verifyOAuthState } from '@/utils/auth';

const buildApp = () => {
  const app = express();
  passportMiddleware.init(app);
  app.use(new AuthRoute().router);
  return app;
};

describe('Slack auth routes', () => {
  const context = { networkId: 'net1', memberId: 'member1', redirect: 'https://community.example.com/manage/apps/slack' };

  it('redirects to Slack with a signed state and the registered callback url', async () => {
    // Arrange
    const app = buildApp();
    const token = signConnectToken(context);

    // Act
    const res = await request(app).get(`/api/slack/webhook/auth?jwt=${encodeURIComponent(token)}`);

    // Assert
    expect(res.status).toEqual(302);
    const location = new URL(res.headers.location);
    expect(location.hostname).toEqual('slack.com');
    expect(location.searchParams.get('client_id')).toEqual('slack-client-id');
    expect(new URL(location.searchParams.get('redirect_uri')).pathname).toEqual('/api/slack/webhook/auth/callback');
    expect(verifyOAuthState(location.searchParams.get('state'))).toEqual(context);
  });

  it('rejects starting the flow without a valid connect token', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).get('/api/slack/webhook/auth?jwt=invalid');

    // Assert
    expect(res.status).toEqual(403);
  });

  it('rejects a callback with a forged state before exchanging the code', async () => {
    // Arrange
    const app = buildApp();
    const forged = Buffer.from(JSON.stringify({ n: 'net1', m: 'member1', s: '', r: 'https://evil.test' }), 'ascii').toString('base64');

    // Act
    const res = await request(app).get(`/api/slack/webhook/auth/callback?code=abc&state=${encodeURIComponent(forged)}`);

    // Assert
    expect(res.status).toEqual(403);
    expect(res.headers.location).toBeUndefined();
  });
});
