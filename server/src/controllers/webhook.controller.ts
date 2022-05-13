import { NextFunction, Request, Response } from 'express';

import { GlobalClient, Types } from '@tribeplatform/gql-client';
import { logger } from '@/utils/logger';
import { CLIENT_ID, CLIENT_SECRET, GRAPHQL_URL, SERVER_URL } from '@/config';
import SlackService, { UpdateMessagePayload } from '@/services/slack.services';
import IncomingWebhookModel from '@/models/incomingWebhook.model';
import { IncomingWebhook as IncomingWebhookType } from '@/interfaces/incoming-webhook.interface';
import auth from '@/utils/auth';

const DEFAULT_SETTINGS = {
  webhooks: [],
  jwt: null,
  authUrl: `${SERVER_URL}/api/slack/webhook/auth`,
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
        case 'APP_UNINSTALLED':
          result = await this.uninstall(input);
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
      .select('_id channel spaceIds teamName events id userId memberId')
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
        webhooks: webhooks.map(webhook => {
          webhook.id = webhook._id;
          delete webhook._id;
          return webhook;
        }),
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
    const { networkId } = input;
    const action = input?.data?.settings?.action;
    const payload = input?.data?.settings?.payload;
    switch (action) {
      case 'DELETE_WEBHOOK':
      case 'UPDATE_WEBHOOK':
        const _id = payload?.id;
        if (!_id) {
          return {
            type: input.type,
            status: 'FAILED',
            data: {},
          };
        }
        const webhook = await IncomingWebhookModel.findOne({ networkId, _id });
        if (action === 'DELETE_WEBHOOK') {
          await webhook.remove();
        } else {
          const fields = ['events', 'spaceIds'];
          for (let field of fields) {
            if (typeof payload[field] != 'undefined') webhook[field] = payload[field];
          }
          await webhook.save();
        }
        break;
    }
    const settings = this.getSettings(input);
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
  private async handleSubscription(input) {
    const { networkId } = input as { networkId: string };
    const webhooks: IncomingWebhookType[] = await IncomingWebhookModel.find({
      networkId,
    }).lean();
    const { object } = input?.data as { object: any; networkId: string };
    const spaceId = object?.spaceId;
    const webhookUrls = webhooks
      .filter(webhook => webhook?.events?.indexOf(input?.data?.name) !== -1)
      .filter(webhook => {
        if (spaceId) return webhook.spaceIds.indexOf(spaceId) !== -1;
        return webhook;
      });
    if (webhookUrls.length) {
      const globalClient = new GlobalClient({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        graphqlUrl: GRAPHQL_URL,
      });

      const tribeClient = await globalClient.getTribeClient({
        networkId,
      });
      const payload: UpdateMessagePayload = {
        event: input?.data?.name,
      };
      let memberId: string;
      let spaceId: string;
      let postId: string;
      let actorId: string;
      switch (input?.data?.name) {
        case 'post.published':
          postId = (object as Types.Post)?.id;
          actorId = (object as Types.Post)?.createdById;
          memberId = (object as Types.Post)?.createdById;
          spaceId = (object as Types.Post)?.spaceId;
          break;
        case 'moderation.created':
        case 'moderation.accepted':
        case 'moderation.rejected':
          if (object.entityType === Types.ModerationEntityType.POST) postId = object.entityId;
          else if (object.entityType === Types.ModerationEntityType.MEMBER) memberId = object.createdById;
          spaceId = object?.spaceId;
          actorId = object?.actor?.id;
          break;
        case 'space_membership.created':
        case 'space_membership.deleted':
          memberId = object?.memberId;
          spaceId = object?.spaceId;
          actorId = object?.memberId;
          break;
        case 'space_join_request.created':
        case 'space_join_request.accepted':
          memberId = object?.memberId;
          spaceId = object?.spaceId;
          actorId = object?.memberId;
          break;
        case 'member_invitation.created':
          memberId = object?.memberId;
          spaceId = object?.spaceId;
          actorId = object?.memberId;
          break;
        case 'member.created':
          memberId = (object as Types.Member)?.id;
          break;
      }
      if (memberId) {
        const member = await tribeClient.members.get({ id: memberId }, 'all');
        payload.member = member;
      }
      if (spaceId) {
        const space = await tribeClient.spaces.get({ id: spaceId }, 'all');
        payload.space = space;
      }
      if (actorId) {
        const actor = await tribeClient.members.get({ id: actorId }, 'all');
        payload.actor = actor;
      }
      if (postId) {
        const post = await tribeClient.posts.get({ id: postId }, 'all');
        payload.post = post;
      }

      webhookUrls.forEach(url => new SlackService(url).sendSlackMessage(payload));
    }
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
  private async uninstall(input) {
    const { networkId } = input as { networkId: string };
    await IncomingWebhookModel.deleteMany({
      networkId,
    }).lean();
    return {
      type: input.type,
      status: 'SUCCEEDED',
      data: {},
    };
  }
}

export default WebhookController;
