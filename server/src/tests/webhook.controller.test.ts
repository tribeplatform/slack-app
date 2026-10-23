jest.mock('@/config', () => ({
  CLIENT_SECRET: 'test-client-secret',
  GRAPHQL_URL: 'https://api.bettermode.test/graphql',
  SERVER_URL: 'https://slack-app.test',
}));

const mockLog = jest.fn();
jest.mock('@/utils/logger', () => {
  const instance = { log: (...args) => mockLog(...args), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { createLogger: () => instance, logger: instance };
});

jest.mock('@/services/slack.services', () => jest.fn());

jest.mock('@/models/incomingWebhook.model', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock('@/utils/tribe_client', () => ({
  getTribeClient: jest.fn(),
  listMemberByIds: jest.fn(async () => []),
}));

import IncomingWebhookModel from '@/models/incomingWebhook.model';
import { getTribeClient } from '@/utils/tribe_client';
import WebhookController from '@/controllers/webhook.controller';
import { verifyConnectToken } from '@/utils/auth';

const mockedModel = IncomingWebhookModel as unknown as Record<string, jest.Mock>;
const mockedGetTribeClient = getTribeClient as jest.Mock;

const storedWebhooks = () => [
  {
    _id: { toString: () => 'webhook1' },
    channel: '#general',
    spaceIds: [],
    teamName: 'Team',
    events: ['post.published'],
    userId: 'U1',
  },
];

const call = async (controller: WebhookController, body: any) => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  await controller.index({ body } as any, res, jest.fn());
  return res.json.mock.calls[0]?.[0];
};

const network = {
  id: 'net1',
  domain: 'community.example.com',
  newDomain: null,
  domainSubfolder: null,
  aliases: [],
};

describe('WebhookController', () => {
  const controller = new WebhookController();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedModel.find.mockReturnValue({ select: () => ({ lean: async () => storedWebhooks() }), lean: async () => storedWebhooks() });
    mockedGetTribeClient.mockResolvedValue({ network: { get: jest.fn(async () => network) } });
  });

  describe('GET_SETTINGS', () => {
    it('never returns a connect credential', async () => {
      // Arrange
      const body = {
        type: 'GET_SETTINGS',
        networkId: 'net1',
        context: 'NETWORK',
        currentSettings: [{ settings: { jwt: 'stored-legacy-jwt', connectUrl: 'https://slack-app.test/x' } }],
      };

      // Act
      const result = await call(controller, body);

      // Assert
      expect(result.status).toEqual('SUCCEEDED');
      expect(result.data).not.toHaveProperty('jwt');
      expect(result.data).not.toHaveProperty('connectUrl');
      expect(result.data.authUrl).toEqual('https://slack-app.test/api/slack/webhook/auth');
      expect(result.data.webhooks).toEqual([expect.objectContaining({ id: 'webhook1', channel: '#general' })]);
      expect(JSON.stringify(result)).not.toMatch(/eyJ/);
    });
  });

  describe('UPDATE_SETTINGS', () => {
    it('returns a short-lived connect url outside toStore', async () => {
      // Arrange
      const body = {
        type: 'UPDATE_SETTINGS',
        networkId: 'net1',
        context: 'NETWORK',
        currentSettings: [],
        data: {
          settings: {
            action: 'GET_CONNECT_URL',
            payload: { memberId: 'member1', spaceIds: ['space1'], redirect: 'https://community.example.com/manage/apps/slack' },
          },
        },
      };

      // Act
      const result = await call(controller, body);

      // Assert
      expect(result.status).toEqual('SUCCEEDED');
      expect(result.data).not.toHaveProperty('toStore');
      expect(Object.keys(result.data)).toEqual(['connectUrl']);
      const url = new URL(result.data.connectUrl);
      expect(`${url.origin}${url.pathname}`).toEqual('https://slack-app.test/api/slack/webhook/auth');
      expect(verifyConnectToken(url.searchParams.get('jwt'))).toEqual({
        networkId: 'net1',
        memberId: 'member1',
        spaceIds: 'space1',
        redirect: 'https://community.example.com/manage/apps/slack',
      });
      expect(mockedModel.create).not.toHaveBeenCalled();
      expect(mockedModel.findOne).not.toHaveBeenCalled();
      expect(mockedModel.deleteMany).not.toHaveBeenCalled();
    });

    it('replaces a redirect outside the network domains', async () => {
      // Arrange
      const body = {
        type: 'UPDATE_SETTINGS',
        networkId: 'net1',
        context: 'NETWORK',
        currentSettings: [],
        data: { settings: { action: 'GET_CONNECT_URL', payload: { memberId: 'member1', redirect: 'https://evil.test/' } } },
      };

      // Act
      const result = await call(controller, body);

      // Assert
      const token = new URL(result.data.connectUrl).searchParams.get('jwt');
      expect(verifyConnectToken(token)?.redirect).toEqual('https://community.example.com/');
    });

    it('still returns a connect url when the network lookup fails', async () => {
      // Arrange
      mockedGetTribeClient.mockRejectedValue(new Error('unavailable'));
      const body = {
        type: 'UPDATE_SETTINGS',
        networkId: 'net1',
        context: 'NETWORK',
        currentSettings: [],
        data: { settings: { action: 'GET_CONNECT_URL', payload: { memberId: 'member1', redirect: 'https://community.example.com/x' } } },
      };

      // Act
      const result = await call(controller, body);

      // Assert
      const token = new URL(result.data.connectUrl).searchParams.get('jwt');
      expect(verifyConnectToken(token)).toEqual({ networkId: 'net1', memberId: 'member1', redirect: 'https://community.example.com/x' });
    });

    it('fails early without a member id', async () => {
      // Arrange
      const body = {
        type: 'UPDATE_SETTINGS',
        networkId: 'net1',
        context: 'NETWORK',
        currentSettings: [],
        data: { settings: { action: 'GET_CONNECT_URL', payload: { redirect: 'https://community.example.com/x' } } },
      };

      // Act
      const result = await call(controller, body);

      // Assert
      expect(result.status).toEqual('FAILED');
      expect(result.data).toEqual({});
    });

    it('keeps deleting connections without storing settings', async () => {
      // Arrange
      const webhook = { remove: jest.fn(async () => undefined) };
      mockedModel.findOne.mockResolvedValue(webhook);
      const body = {
        type: 'UPDATE_SETTINGS',
        networkId: 'net1',
        context: 'NETWORK',
        currentSettings: [],
        data: { settings: { action: 'DELETE_WEBHOOK', payload: { id: 'webhook1' } } },
      };

      // Act
      const result = await call(controller, body);

      // Assert
      expect(mockedModel.findOne).toHaveBeenCalledWith({ networkId: 'net1', _id: 'webhook1' });
      expect(webhook.remove).toHaveBeenCalled();
      expect(result).toEqual({ type: 'UPDATE_SETTINGS', status: 'SUCCEEDED', data: {} });
    });
  });

  it('does not log the webhook payload', async () => {
    // Arrange
    const body = {
      type: 'GET_SETTINGS',
      networkId: 'net1',
      context: 'NETWORK',
      currentSettings: [{ settings: { secretValue: 'do-not-log-me' } }],
    };

    // Act
    await call(controller, body);

    // Assert
    expect(mockLog).toHaveBeenCalled();
    expect(JSON.stringify(mockLog.mock.calls)).not.toContain('do-not-log-me');
  });

  it('responds FAILED instead of leaving the request open when a handler throws', async () => {
    // Arrange
    mockedModel.find.mockImplementation(() => {
      throw new Error('boom');
    });

    // Act
    const result = await call(controller, { type: 'GET_SETTINGS', networkId: 'net1', context: 'NETWORK', currentSettings: [] });

    // Assert
    expect(result).toEqual({ type: 'GET_SETTINGS', status: 'FAILED', data: {} });
  });

  it('does not let a failing Slack delivery escape as an unhandled rejection', async () => {
    // Arrange
    const SlackService = require('@/services/slack.services') as jest.Mock;
    const sendSlackMessage = jest.fn(async () => {
      throw new Error('An API error occurred: token_revoked');
    });
    SlackService.mockImplementation(() => ({ sendSlackMessage }));
    const webhooks = [{ accessToken: 'xoxb-1', channelId: 'C1', spaceIds: [], events: ['member.verified'] }];
    mockedModel.find.mockReturnValue({ lean: async () => webhooks });
    mockedGetTribeClient.mockResolvedValue({ query: jest.fn(async () => ({ id: 'm1', name: 'Jane' })) });
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    // Act
    const result = await call(controller, { type: 'SUBSCRIPTION', networkId: 'net1', data: { name: 'member.verified', object: { id: 'm1' } } });
    await new Promise(resolve => setImmediate(resolve));
    process.off('unhandledRejection', unhandled);

    // Assert
    expect(result).toEqual({ type: 'SUBSCRIPTION', status: 'SUCCEEDED', data: {} });
    expect(sendSlackMessage).toHaveBeenCalledWith('C1', expect.anything());
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('skips connections whose Slack token was flagged inactive', async () => {
    // Arrange
    const SlackService = require('@/services/slack.services') as jest.Mock;
    const sendSlackMessage = jest.fn(async () => undefined);
    SlackService.mockImplementation(() => ({ sendSlackMessage }));
    const webhooks = [
      { accessToken: 'xoxb-revoked', channelId: 'C1', spaceIds: [], events: ['member.verified'], tokenInactiveAt: new Date() },
      { accessToken: 'xoxb-valid', channelId: 'C2', spaceIds: [], events: ['member.verified'] },
    ];
    mockedModel.find.mockReturnValue({ lean: async () => webhooks });
    mockedGetTribeClient.mockResolvedValue({ query: jest.fn(async () => ({ id: 'm1', name: 'Jane' })) });

    // Act
    await call(controller, { type: 'SUBSCRIPTION', networkId: 'net1', data: { name: 'member.verified', object: { id: 'm1' } } });

    // Assert
    expect(sendSlackMessage).toHaveBeenCalledTimes(1);
    expect(sendSlackMessage).toHaveBeenCalledWith('C2', expect.anything());
  });

  it('does not call Bettermode when every matching connection is inactive', async () => {
    // Arrange
    const webhooks = [{ accessToken: 'xoxb-revoked', channelId: 'C1', spaceIds: [], events: ['member.verified'], tokenInactiveAt: new Date() }];
    mockedModel.find.mockReturnValue({ lean: async () => webhooks });

    // Act
    const result = await call(controller, { type: 'SUBSCRIPTION', networkId: 'net1', data: { name: 'member.verified', object: { id: 'm1' } } });

    // Assert
    expect(result).toEqual({ type: 'SUBSCRIPTION', status: 'SUCCEEDED', data: {} });
    expect(mockedGetTribeClient).not.toHaveBeenCalled();
  });
});
