import { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } from '@config';

import passport from 'passport';
import express from 'express';

const SlackStrategy = require('passport-slack').Strategy;
interface Params {
  ok: true;
  access_token: string;
  scope: string;
  user_id: string;
  team_id: string;
  enterprise_id: string;
  team_name: string;
  incoming_webhook: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
}
const init = (app: express.Application) => {
  passport.use(
    new SlackStrategy(
      {
        name: 'slack',
        clientID: SLACK_CLIENT_ID,
        clientSecret: SLACK_CLIENT_SECRET,
        scope: ['incoming-webhook'],
        skipUserProfile: true,
        passReqToCallback: true,
        callbackURL: '/api/slack/auth/callback',
      },
      (req: express.Request, accessToken: string, refreshToken: string, params: Params, profile, done) => {
        done(null, profile);
      },
    ),
  );
  app.use(passport.initialize());
};

export default {
  init,
};
