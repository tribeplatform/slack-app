jest.mock('@/config', () => ({
  CLIENT_SECRET: 'test-client-secret',
  SERVER_URL: 'https://slack-app.test',
}));

jest.mock('@/utils/logger', () => {
  const instance = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { createLogger: () => instance, logger: instance };
});

const mockSendSlackMessage = jest.fn(async (..._args: any[]) => undefined);
jest.mock('@/services/slack.services', () => jest.fn().mockImplementation(() => ({ sendSlackMessage: mockSendSlackMessage })));

const mockFind = jest.fn();
jest.mock('@/models/incomingWebhook.model', () => ({ find: (...args: any[]) => mockFind(...args) }));

const mockQuery = jest.fn();
const mockGetNetwork = jest.fn(async (..._args: any[]) => ({ id: 'net1', name: 'Community' }));
jest.mock('@/utils/tribe_client', () => ({
  getTribeClient: async () => ({ query: mockQuery }),
  getNetwork: (...args: any[]) => mockGetNetwork(...args),
  listMemberByIds: async () => [],
}));

import WebhookController from '@/controllers/webhook.controller';

const call = async (body: any) => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  await new WebhookController().index({ body } as any, res, jest.fn());
  return res.json.mock.calls[0]?.[0];
};

describe('WebhookController SUBSCRIPTION', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFind.mockReturnValue({ lean: async () => [{ accessToken: 'xoxb-1', channelId: 'C1', spaceIds: [], events: ['post.published'] }] });
    mockQuery.mockImplementation(async ({ name }) => ({ id: name === 'post' ? 'p1' : 'm1', name: 'Jane', createdAt: '2020-01-01' }));
  });

  it('gets the network through the cache and fetches the author once', async () => {
    // Act
    const result = await call({
      type: 'SUBSCRIPTION',
      networkId: 'net1',
      data: { name: 'post.published', object: { id: 'p1', createdById: 'm1', spaceId: 's1' } },
    });

    // Assert
    expect(result).toEqual({ type: 'SUBSCRIPTION', status: 'SUCCEEDED', data: {} });
    expect(mockGetNetwork).toHaveBeenCalledWith('net1', expect.anything());
    expect(mockQuery.mock.calls.filter(([options]) => options.name === 'network')).toHaveLength(0);
    expect(mockQuery.mock.calls.filter(([options]) => options.name === 'member')).toHaveLength(1);
    expect(mockSendSlackMessage).toHaveBeenCalledWith('C1', expect.objectContaining({ actor: expect.objectContaining({ id: 'm1' }) }));
  });

  it('still fetches the actor when it is someone else', async () => {
    // Arrange
    mockFind.mockReturnValue({ lean: async () => [{ accessToken: 'xoxb-1', channelId: 'C1', spaceIds: [], events: ['space_membership.created'] }] });

    // Act
    await call({
      type: 'SUBSCRIPTION',
      networkId: 'net1',
      data: { name: 'space_membership.created', actor: { id: 'admin1' }, object: { memberId: 'm1', spaceId: 's1' } },
    });

    // Assert
    const memberIds = mockQuery.mock.calls.filter(([options]) => options.name === 'member').map(([options]) => options.args.variables.id);
    expect(memberIds).toEqual(['m1', 'admin1']);
  });
});
