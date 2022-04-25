import { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } from '@config';

import passport from 'passport';
import express from 'express';
import IncomingWebhookModel from '@/models/incomingWebhook.model';
import { IncomingWebhook as IncomingWebhookType } from '@/interfaces/incoming-webhook.interface';
import { logger } from '@/utils/logger';
import SlackService from '@/services/slack.services';
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
        name: 'webhook',
        clientID: SLACK_CLIENT_ID,
        clientSecret: SLACK_CLIENT_SECRET,
        scope: ['incoming-webhook'],
        skipUserProfile: true,
        passReqToCallback: true,
        callbackURL: '/api/slack/webhook/auth/callback',
      },
      async (req: express.Request, accessToken: string, refreshToken: string, params: Params, profile, done) => {
        try {
          let buff = Buffer.from(String(req.query.state), 'base64');
          const { n: networkId } = JSON.parse(buff.toString('ascii')) as { n: string };
          const webhook: IncomingWebhookType = await IncomingWebhookModel.create({
            channel: params?.incoming_webhook?.channel,
            channelId: params?.incoming_webhook?.channel_id,
            url: params?.incoming_webhook?.url,
            configUrl: params?.incoming_webhook?.configuration_url,
            scope: params?.scope,
            accessToken: params?.access_token,
            userId: params?.user_id,
            teamId: params?.team_id,
            teamName: params?.team_name,
            networkId,
          });

         await new SlackService(webhook.url).sendWelcomeMessage()
          
          done(null, webhook);
        } catch (err) {
          logger.error('An error occured during the SlackStrategy handling');
          logger.error(err);
          done(err, {});
        }
      },
    ),
  );
  app.use(passport.initialize());
};

export default {
  init,
};
