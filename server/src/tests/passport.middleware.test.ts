jest.mock('@/config', () => ({
  CLIENT_SECRET: 'test-client-secret',
  SLACK_CLIENT_ID: 'slack-client-id',
  SLACK_CLIENT_SECRET: 'slack-client-secret',
}));

const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
jest.mock('@/utils/logger', () => ({ createLogger: () => mockLogger, logger: mockLogger }));

let mockVerify: (...args: any[]) => Promise<void>;
jest.mock('passport-slack', () => ({
  Strategy: jest.fn().mockImplementation((options, verify) => {
    mockVerify = verify;
    return { name: options.name, authenticate: jest.fn() };
  }),
}));

const mockCreate = jest.fn();
jest.mock('@/models/incomingWebhook.model', () => ({ create: (...args: any[]) => mockCreate(...args) }));

const mockSendWelcomeMessage = jest.fn();
jest.mock('@/services/slack.services', () => jest.fn().mockImplementation(() => ({ sendWelcomeMessage: mockSendWelcomeMessage })));

const mockNetworkGet = jest.fn();
jest.mock('@tribeplatform/gql-client', () => ({
  GlobalClient: jest.fn().mockImplementation(() => ({ getTribeClient: async () => ({ network: { get: mockNetworkGet } }) })),
}));

import express from 'express';
import passportMiddleware from '@middlewares/passport.middleware';
import { signOAuthState } from '@/utils/auth';

const params = {
  ok: true,
  access_token: 'xoxb-1',
  scope: 'incoming-webhook,chat:write:bot',
  user_id: 'U1',
  team_id: 'T1',
  team_name: 'Team',
  incoming_webhook: { channel: '#general', channel_id: 'C1', configuration_url: 'https://slack.test/config', url: 'https://hooks.slack.test/1' },
};

const runVerify = async (overrides: Record<string, any> = {}) => {
  const req = { query: { state: signOAuthState({ networkId: 'net1', memberId: 'member1' }) } };
  const done = jest.fn();
  await mockVerify(req, 'xoxb-1', undefined, { ...params, ...overrides }, {}, done);
  return done;
};

describe('Slack OAuth verify callback', () => {
  beforeAll(() => passportMiddleware.init(express()));

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockImplementation(async doc => doc);
    mockNetworkGet.mockResolvedValue({ name: 'Community' });
    mockSendWelcomeMessage.mockResolvedValue({ ok: true });
  });

  it('saves the connection and sends the welcome message', async () => {
    // Act
    const done = await runVerify();

    // Assert
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ networkId: 'net1', memberId: 'member1', channelId: 'C1', accessToken: 'xoxb-1' }));
    expect(mockSendWelcomeMessage).toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ channelId: 'C1' }));
  });

  it('fails the flow without a 500 when Slack returns no incoming webhook', async () => {
    // Act
    const done = await runVerify({ incoming_webhook: undefined });

    // Assert
    expect(mockCreate).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(null, false);
  });

  it('keeps the connection when the welcome message fails', async () => {
    // Arrange
    mockNetworkGet.mockRejectedValue(new Error('You have made too many requests and exceeded the API quota.'));

    // Act
    const done = await runVerify();

    // Assert
    expect(mockCreate).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ channelId: 'C1' }));
  });
});
