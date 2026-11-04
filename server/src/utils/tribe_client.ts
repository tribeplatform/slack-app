import { CLIENT_ID, CLIENT_SECRET, GRAPHQL_URL } from '@/config';
import { GlobalClient, TribeClient, Types } from '@tribeplatform/gql-client';
import jwt from 'jsonwebtoken';

// Bettermode rate-limits API calls per network ("You have made too many requests and exceeded the API quota").
// Every webhook used to fetch a new app token and the network before doing any work, so both are cached per network.
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;
const DEFAULT_CLIENT_TTL_MS = 10 * 60 * 1000;
export const NETWORK_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = { value: Promise<T>; expiresAt: number };

const clientCache = new Map<string, CacheEntry<TribeClient>>();
const networkCache = new Map<string, CacheEntry<Types.Network>>();

export const clearTribeClientCache = () => {
  clientCache.clear();
  networkCache.clear();
};

const clientExpiresAt = (client: TribeClient): number => {
  const decoded = jwt.decode(client?.accessToken || '') as jwt.JwtPayload | null;
  if (decoded?.exp) return decoded.exp * 1000 - TOKEN_EXPIRY_MARGIN_MS;
  return Date.now() + DEFAULT_CLIENT_TTL_MS;
};

const cached = <T>(cache: Map<string, CacheEntry<T>>, key: string, load: () => Promise<T>, expiresAt: (value: T) => number): Promise<T> => {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  const value = load();
  // Concurrent webhooks for the same network share one in-flight request.
  const newEntry: CacheEntry<T> = { value, expiresAt: Number.MAX_SAFE_INTEGER };
  cache.set(key, newEntry);
  value.then(
    result => {
      newEntry.expiresAt = expiresAt(result);
    },
    () => {
      // Never cache failures (e.g. a 429), the next webhook tries again.
      if (cache.get(key) === newEntry) cache.delete(key);
    },
  );
  return value;
};

export const getTribeClient = async ({ networkId }: { networkId: string }): Promise<TribeClient> =>
  cached(
    clientCache,
    networkId,
    () =>
      new GlobalClient({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        graphqlUrl: GRAPHQL_URL,
      }).getTribeClient({ networkId }),
    clientExpiresAt,
  );

/**
 * The network (with its favicon) used to render Slack messages. It rarely changes, so it is cached for a few minutes.
 */
export const getNetwork = async (networkId: string, client: TribeClient): Promise<Types.Network> =>
  cached(
    networkCache,
    networkId,
    () => client.query({ name: 'network', args: { fields: { favicon: 'all' } } as any }),
    () => Date.now() + NETWORK_TTL_MS,
  );

export const listMemberByIds = async ({ ids }: { ids: string[] }, client: TribeClient): Promise<Types.Member[]> => {
  const members: Types.Member[] = [];
  for (const idx in ids) {
    const member = await client.members.get({ id: ids[idx] }, 'basic');
    if (member) members.push(member);
  }
  return members;
};
