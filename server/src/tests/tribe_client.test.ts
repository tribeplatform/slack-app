jest.mock('@/config', () => ({ CLIENT_ID: 'id', CLIENT_SECRET: 'secret', GRAPHQL_URL: 'https://api.bettermode.test/global' }));

const mockGetTribeClient = jest.fn();
jest.mock('@tribeplatform/gql-client', () => ({
  GlobalClient: jest.fn().mockImplementation(() => ({ getTribeClient: (...args: any[]) => mockGetTribeClient(...args) })),
}));

import jwt from 'jsonwebtoken';
import { clearTribeClientCache, getNetwork, getTribeClient, NETWORK_TTL_MS } from '@/utils/tribe_client';

const tokenExpiringIn = (seconds: number) => jwt.sign({ exp: Math.floor(Date.now() / 1000) + seconds }, 'k');

describe('tribe_client cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    clearTribeClientCache();
  });

  it('reuses the client for a network until its token is about to expire', async () => {
    // Arrange
    jest.useFakeTimers('modern');
    mockGetTribeClient.mockImplementation(async () => ({ accessToken: tokenExpiringIn(60 * 60) }));

    // Act
    const first = await getTribeClient({ networkId: 'net1' });
    const second = await getTribeClient({ networkId: 'net1' });
    jest.setSystemTime(Date.now() + 56 * 60 * 1000);
    const third = await getTribeClient({ networkId: 'net1' });

    // Assert
    expect(second).toBe(first);
    expect(third).not.toBe(first);
    expect(mockGetTribeClient).toHaveBeenCalledTimes(2);
  });

  it('keeps one client per network', async () => {
    // Arrange
    mockGetTribeClient.mockImplementation(async ({ networkId }) => ({ networkId, accessToken: tokenExpiringIn(3600) }));

    // Act
    const a = await getTribeClient({ networkId: 'net1' });
    const b = await getTribeClient({ networkId: 'net2' });

    // Assert
    expect(a).not.toBe(b);
    expect(mockGetTribeClient).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed token request', async () => {
    // Arrange
    mockGetTribeClient.mockRejectedValueOnce(new Error('exceeded the API quota')).mockResolvedValueOnce({ accessToken: tokenExpiringIn(3600) });

    // Act + Assert
    await expect(getTribeClient({ networkId: 'net1' })).rejects.toThrow('exceeded the API quota');
    await expect(getTribeClient({ networkId: 'net1' })).resolves.toBeDefined();
    expect(mockGetTribeClient).toHaveBeenCalledTimes(2);
  });

  it('caches the network for a few minutes', async () => {
    // Arrange
    jest.useFakeTimers('modern');
    const client: any = { query: jest.fn(async () => ({ id: 'net1', name: 'Community' })) };

    // Act
    await getNetwork('net1', client);
    await getNetwork('net1', client);
    jest.setSystemTime(Date.now() + NETWORK_TTL_MS + 1);
    await getNetwork('net1', client);

    // Assert
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query).toHaveBeenCalledWith({ name: 'network', args: { fields: { favicon: 'all' } } });
  });
});
