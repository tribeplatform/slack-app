import { NextFunction, Request, Response } from 'express';

import { TribeClient, Types } from '@tribeplatform/gql-client';
import { logger } from '@/utils/logger';
import { CLIENT_ID, CLIENT_SECRET, GRAPHQL_URL } from '@/config';
import SlackService from '@/services/slack.services';
import IncomingWebhookModel from '@/models/incomingWebhook.model';
import { IncomingWebhook as IncomingWebhookType } from '@/interfaces/incoming-webhook.interface';
import auth from '@/utils/auth';

const DEFAULT_SETTINGS = {
  webhooks: [],
  jwt: null,
};

class WebhookController {
  public index = async (req: Request, res: Response, next: NextFunction) => {
    const input = req.body;
    try {
      if (input.data?.challenge) {
        return res.json({
          type: 'TEST',
          status: 'SUCCEEDED',
          data: {
            challenge: req.body?.data?.challenge,
          },
        });
      }
      let result: any = {
        type: input.type,
        status: 'SUCCEEDED',
        data: {},
      };

      switch (input.type) {
        case 'GET_SETTINGS':
          result = await this.getSettings(input);
          break;
        case 'UPDATE_SETTINGS':
          result = await this.updateSettings(input);
          break;
        case 'SUBSCRIPTION':
          result = await this.handleSubscription(input);
          break;
      }
      res.status(200).json(result);
    } catch (error) {
      logger.error(error);
      return {
        type: input.type,
        status: 'FAILED',
        data: {},
      };
    }
  };

  /**
   *
   * @param input
   * @returns { type: input.type, status: 'SUCCEEDED', data: {} }
   * TODO: Elaborate on this function
   */
  private async getSettings(input) {
    const { networkId } = input;
    const currentSettings = input.currentSettings[0]?.settings || {};
    let defaultSettings;
    const webhooks = await IncomingWebhookModel.find({
      networkId,
    })
      .select('channel teamName')
      .lean();
    switch (input.context) {
      case Types.PermissionContext.NETWORK:
        defaultSettings = DEFAULT_SETTINGS;
        break;
      default:
        defaultSettings = {};
    }
    const settings = {
      ...defaultSettings,
      ...currentSettings,
      ...{
        webhooks,
        jwt: auth.sign({ networkId }),
      },
    };
    return {
      type: input.type,
      status: 'SUCCEEDED',
      data: settings,
    };
  }

  /**
   *
   * @param input
   * @returns { type: input.type, status: 'SUCCEEDED', data: {} }
   * TODO: Elaborate on this function
   */
  private async updateSettings(input) {
    return {
      type: input.type,
      status: 'SUCCEEDED',
      data: {},
    };
  }

  /**
   *
   * @param input
   * @returns { type: input.type, status: 'SUCCEEDED', data: {} }
   * TODO: Elaborate on this function
   */
  private async handleSubscription(input) {
    const { networkId } = input as { networkId: string };
    const webhooks: IncomingWebhookType[] = await IncomingWebhookModel.find({
      networkId,
    }).lean();
    const webhookUrls = webhooks.filter(webhook => webhook?.events?.indexOf(input?.data?.name) !== -1);
    if (webhookUrls.length) {
      const tribeClient = new TribeClient({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        graphqlUrl: GRAPHQL_URL,
      });

      const { object } = input?.data as { object: Types.Post; networkId: string };
      const authorId = object?.createdById;
      const spaceId = object?.spaceId;
      const accessToken = await tribeClient.generateToken({
        networkId,
      });
      const [post, author, space] = await Promise.all([
        tribeClient.posts.get(
          {
            id: object.id,
          },
          'all',
          accessToken,
        ),
        tribeClient.members.get(
          {
            id: authorId,
          },
          'all',
          accessToken,
        ),
        tribeClient.spaces.get(
          {
            id: spaceId,
          },
          'all',
          accessToken,
        ),
      ]);
      const options = {
        post: {
          id: post.id,
          title: post.title,
          content: post.shortContent,
          url: post.url,
          // image: (post?.seoDetail?.image as Types.Image)?.url,
        },
        author: {
          id: author.id,
          name: author.name,
          url: author.url,
          profilePicture: (author?.profilePicture as Types.Image)?.urls?.small,
        },
        space: {
          id: space.id,
          name: space.name,
          url: space.url,
        },
      };

      webhookUrls.forEach(url => new SlackService(url).sendNewPostMessage(options));
    }
    return {
      type: input.type,
      status: 'SUCCEEDED',
      data: {},
    };
  }
}

export default WebhookController;
