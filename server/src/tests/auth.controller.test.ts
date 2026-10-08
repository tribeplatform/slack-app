jest.mock('@/config', () => ({
  CLIENT_SECRET: 'test-client-secret',
  GRAPHQL_URL: 'https://api.bettermode.test/graphql',
  SERVER_URL: 'https://slack-app.test',
}));

const authorizeHandler = jest.fn();
jest.mock('passport', () => ({
  authorize: jest.fn(() => authorizeHandler),
}));

import passport from 'passport';
import jwt from 'jsonwebtoken';
import AuthController from '@/controllers/auth.controller';
import { signConnectToken, signOAuthState, verifyOAuthState } from '@/utils/auth';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.redirect = jest.fn(() => res);
  return res;
};

const context = {
  networkId: 'net1',
  memberId: 'member1',
  spaceIds: 'space1',
  redirect: 'https://community.example.com/manage/apps/slack',
};

const forgedState = Buffer.from(JSON.stringify({ n: 'net1', m: 'member1', s: '', r: 'https://evil.test' }), 'ascii').toString('base64');

describe('AuthController', () => {
  const controller = new AuthController();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('webhookAuth', () => {
    it('requires a token', async () => {
      // Arrange
      const res = createResponse();

      // Act
      await controller.webhookAuth({ query: {} } as any, res, jest.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(passport.authorize).not.toHaveBeenCalled();
    });

    it('rejects the legacy settings jwt', async () => {
      // Arrange
      const legacy = jwt.sign({ sub: 'net1', aud: 'https://api.bettermode.test/graphql', iss: 'tribe-slack-app' }, 'test-client-secret', {
        expiresIn: '2d',
      });
      const res = createResponse();

      // Act
      await controller.webhookAuth({ query: { jwt: legacy } } as any, res, jest.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(passport.authorize).not.toHaveBeenCalled();
    });

    it('starts the oauth flow with a signed state built from the connect token only', async () => {
      // Arrange
      const token = signConnectToken(context);
      const req: any = { query: { jwt: token, member: 'attacker', spaceIds: 'other', redirect: 'https://evil.test' } };
      const res = createResponse();

      // Act
      await controller.webhookAuth(req, res, jest.fn());

      // Assert
      expect(passport.authorize).toHaveBeenCalledTimes(1);
      const [strategy, options] = (passport.authorize as jest.Mock).mock.calls[0];
      expect(strategy).toEqual('webhook');
      expect(verifyOAuthState(options.state)).toEqual(context);
      expect(authorizeHandler).toHaveBeenCalledWith(req, res, expect.any(Function));
    });
  });

  describe('verifyCallbackState', () => {
    it.each([
      ['a forged state', forgedState],
      ['a connect token', signConnectToken(context)],
      ['a missing state', undefined],
    ])('rejects %s', (_, state) => {
      // Arrange
      const res = createResponse();
      const next = jest.fn();

      // Act
      controller.verifyCallbackState({ query: { state, code: 'code' } } as any, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('accepts a state issued by the app', () => {
      // Arrange
      const res = createResponse();
      const next = jest.fn();

      // Act
      controller.verifyCallbackState({ query: { state: signOAuthState(context), code: 'code' } } as any, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('webhookAuthCallback', () => {
    it('redirects back to the community from a valid state', async () => {
      // Arrange
      const res = createResponse();

      // Act
      await controller.webhookAuthCallback({ query: { state: signOAuthState(context) } } as any, res, jest.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(context.redirect);
    });

    it('does not redirect to a target from a forged state', async () => {
      // Arrange
      const res = createResponse();

      // Act
      await controller.webhookAuthCallback({ query: { state: forgedState } } as any, res, jest.fn());

      // Assert
      expect(res.redirect).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('webhookAuthFailure', () => {
    it('does not redirect to a target from a forged state', async () => {
      // Arrange
      const res = createResponse();

      // Act
      await controller.webhookAuthFailure({ query: { state: forgedState } } as any, res, jest.fn());

      // Assert
      expect(res.redirect).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });

    it('redirects back to the community from a valid state', async () => {
      // Arrange
      const res = createResponse();

      // Act
      await controller.webhookAuthFailure({ query: { state: signOAuthState(context) } } as any, res, jest.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(context.redirect);
    });
  });
});
