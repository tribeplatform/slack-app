jest.mock('@/config', () => ({}));

const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
const mockCreateLogger = jest.fn(() => mockLogger);
jest.mock('@/utils/logger', () => ({ createLogger: mockCreateLogger, logger: mockLogger }));

const mockPostMessage = jest.fn();
jest.mock('@slack/web-api', () => {
  const actual = jest.requireActual('@slack/web-api');
  return {
    ...actual,
    WebClient: jest.fn().mockImplementation(() => ({ chat: { postMessage: mockPostMessage } })),
  };
});

const mockUpdateMany = jest.fn(async (..._args: any[]) => ({}));
jest.mock('@/models/incomingWebhook.model', () => ({ updateMany: (...args) => mockUpdateMany(...args) }));

import { ErrorCode } from '@slack/web-api';
import SlackService, { isInactiveTokenError, resetInactiveTokens, UpdateMessagePayload } from '@/services/slack.services';
import { createEntityHyperLink } from '@/utils/blockParser';

const platformError = (error: string) => Object.assign(new Error(`An API error occurred: ${error}`), { code: ErrorCode.PlatformError, data: { ok: false, error } });

const payload: UpdateMessagePayload = {
  event: 'post.published',
  network: { id: 'net1', name: 'Community', domain: 'community.example.com' } as any,
  member: { id: 'm1', name: 'Jane', url: 'https://community.example.com/member/m1' } as any,
  post: { id: 'p1', title: 'Hello', url: 'https://community.example.com/post/p1' } as any,
};

describe('SlackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInactiveTokens();
  });

  it('does not create a logger per instance', () => {
    new SlackService('xoxb-1');
    new SlackService('xoxb-2');
    expect(mockCreateLogger).not.toHaveBeenCalled();
  });

  it.each(['token_revoked', 'account_inactive', 'invalid_auth'])('resolves on %s, warns once and skips the token afterwards', async error => {
    // Arrange
    mockPostMessage.mockRejectedValue(platformError(error));

    // Act
    await expect(new SlackService('xoxb-revoked').sendSlackMessage('C1', payload)).resolves.toBeUndefined();
    await expect(new SlackService('xoxb-revoked').sendSlackMessage('C1', payload)).resolves.toBeUndefined();

    // Assert
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('persists the inactive flag on the connections that use the revoked token', async () => {
    // Arrange
    mockPostMessage.mockRejectedValue(platformError('token_revoked'));

    // Act
    await new SlackService('xoxb-revoked').sendSlackMessage('C1', payload);

    // Assert
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { accessToken: 'xoxb-revoked', networkId: 'net1' },
      { $set: { tokenInactiveAt: expect.any(Date), tokenInactiveReason: 'token_revoked' } },
    );
  });

  it('still resolves when persisting the inactive flag fails', async () => {
    // Arrange
    mockPostMessage.mockRejectedValue(platformError('account_inactive'));
    mockUpdateMany.mockRejectedValueOnce(new Error('mongo down'));

    // Act + Assert
    await expect(new SlackService('xoxb-revoked').sendSlackMessage('C1', payload)).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  it('does not flag the connection for other Slack errors', async () => {
    // Arrange
    mockPostMessage.mockRejectedValue(platformError('channel_not_found'));

    // Act
    await new SlackService('xoxb-1').sendSlackMessage('C1', payload);

    // Assert
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('keeps sending for other tokens after one is revoked', async () => {
    mockPostMessage.mockRejectedValueOnce(platformError('token_revoked')).mockResolvedValueOnce({ ok: true });

    await new SlackService('xoxb-revoked').sendSlackMessage('C1', payload);
    await new SlackService('xoxb-valid').sendSlackMessage('C2', payload);

    expect(mockPostMessage).toHaveBeenCalledTimes(2);
  });

  it('logs other Slack errors without rejecting and retries next time', async () => {
    mockPostMessage.mockRejectedValue(platformError('channel_not_found'));

    await expect(new SlackService('xoxb-1').sendSlackMessage('C1', payload)).resolves.toBeUndefined();
    await expect(new SlackService('xoxb-1').sendSlackMessage('C1', payload)).resolves.toBeUndefined();

    expect(mockPostMessage).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).toHaveBeenCalledTimes(2);
  });

  it('does not treat non-platform errors as revoked tokens', () => {
    expect(isInactiveTokenError(new Error('token_revoked'))).toBe(false);
    expect(isInactiveTokenError(undefined)).toBe(false);
    expect(isInactiveTokenError(platformError('token_revoked'))).toBe(true);
  });

  it('renders a message when the actor is missing', async () => {
    mockPostMessage.mockResolvedValue({ ok: true });

    await new SlackService('xoxb-1').sendSlackMessage('C1', { ...payload, event: 'moderation.rejected', actor: undefined });

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});

describe('createEntityHyperLink', () => {
  it('does not throw for a missing entity', () => {
    expect(createEntityHyperLink(undefined)).toBe('Someone');
  });
});
