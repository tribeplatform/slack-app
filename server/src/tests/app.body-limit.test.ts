jest.mock('@/config', () => ({
  CLIENT_SECRET: 'test-client-secret',
  SIGNING_SECRET: 'test-signing-secret',
  SLACK_CLIENT_ID: 'slack-client-id',
  SLACK_CLIENT_SECRET: 'slack-client-secret',
}));

import App from '@/app';
import WebhookRoute from '@routes/webhook.route';
import request from 'supertest';
import { getSignature } from '@/utils/signature';

describe('App body parsing', () => {
  it('accepts a signed webhook larger than the 100kb body-parser default', async () => {
    // Arrange
    const server = new App([new WebhookRoute()]).getServer();
    const body = JSON.stringify({ type: 'TEST', data: { challenge: 'abc', padding: 'x'.repeat(500 * 1024) } });
    const timestamp = Date.now();
    const signature = getSignature({ secret: 'test-signing-secret', body, timestamp });

    // Act
    const res = await request(server)
      .post('/api/webhook')
      .set('Content-Type', 'application/json')
      .set('x-tribe-request-timestamp', String(timestamp))
      .set('x-tribe-signature', signature)
      .send(body);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ challenge: 'abc' });
  });
});
