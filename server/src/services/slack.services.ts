import { logger } from '@/utils/logger';
import { IncomingWebhook } from '@slack/webhook';
import * as blockUtils from '@utils/blockParser';
import { Types } from '@tribeplatform/gql-client';
interface Options {
  url: string;
}
export interface UpdateMessagePayload {
  event: string;
  member?: Types.Member;
  actor?: Types.Member;
  space?: Types.Space;
  post?: Types.Post;
  network: Types.Network,
  context?: boolean;
}
class SlackService {
  private slackClient: IncomingWebhook;

  constructor(options: Options | string) {
    const url = typeof options === 'string' ? options : options.url;
    this.slackClient = new IncomingWebhook(url);
  }

  public async sendWelcomeMessage() {
    return this.slackClient.send(
      blockUtils.createTextBlock('Hi there, *Community Bot* is here! I would inform you on community updates in this channel.'),
    );
  }
  public async sendSlackMessage(payload: UpdateMessagePayload) {
    try {
      const blocks = [];
      const sentences = [];
      switch (payload.event) {
        case 'post.published':
          sentences.push(
            `${blockUtils.createEntityHyperLink(payload.member)} added a ${blockUtils.createHyperlink({
              text: payload.post.repliedToId ? 'reply' : 'post',
              url: payload.post.url,
            })}`,
          );
          break;
        case 'member.verified':
          sentences.push(`${blockUtils.createEntityHyperLink(payload.member)} joined the community`);
          break;
        case 'moderation.created':
          if (payload.post) {
            sentences.push(`A post flagged for moderation`);
          } else sentences.push(`${blockUtils.createEntityHyperLink(payload.member)} was flagged for moderation`);
          break;
        case 'moderation.rejected':
          if (payload.post) {
            sentences.push(
              `${blockUtils.createEntityHyperLink(payload.actor)} approved this ${blockUtils.createHyperlink({
                text: 'post',
                url: payload.post.url,
              })}`,
            );
          }
          break;
        case 'moderation.accepted':
          if (payload.post) {
            sentences.push(
              `${blockUtils.createEntityHyperLink(payload.actor)} rejected this ${blockUtils.createHyperlink({
                text: 'post',
                url: payload.post.url,
              })}`,
            );
          }
          break;
        case 'space_membership.created':
          if (payload?.member?.id === payload?.actor?.id) {
            sentences.push(`${blockUtils.createEntityHyperLink(payload.member)} joined ${blockUtils.createEntityHyperLink(payload.space)}`);
          } else {
            sentences.push(
              `${blockUtils.createEntityHyperLink(payload.member)} added ${blockUtils.createEntityHyperLink(
                payload.member,
              )} to ${blockUtils.createEntityHyperLink(payload.space)}`,
            );
          }
          break;
        case 'space_membership.deleted':
          if (payload?.member?.id === payload?.actor?.id) {
            sentences.push(`${blockUtils.createEntityHyperLink(payload.member)} left ${blockUtils.createEntityHyperLink(payload.space)}`);
          } else {
            sentences.push(
              `${blockUtils.createEntityHyperLink(payload.actor)} removed ${blockUtils.createEntityHyperLink(
                payload.member,
              )} from ${blockUtils.createEntityHyperLink(payload.space)}`,
            );
          }
          break;
        case 'space_join_request.created':
          sentences.push(`${blockUtils.createEntityHyperLink(payload.member)} requested to join ${blockUtils.createEntityHyperLink(payload.space)}`);
          break;
        case 'space_join_request.accepted':
          sentences.push(
            `${blockUtils.createEntityHyperLink(payload.actor)} accepted ${blockUtils.createEntityHyperLink(
              payload.member,
            )}'s join request to ${blockUtils.createEntityHyperLink(payload.space)}`,
          );
          break;
        case 'member_invitation.created':
          sentences.push(`${blockUtils.createEntityHyperLink(payload.actor)} invited ${payload?.member?.name} to the community`);
          break;
      }
      if (payload.post) {
        sentences.push(
          blockUtils.createHyperlink({
            text: payload.post.repliedTo ? payload.post.repliedTo.title : payload.post.title,
            url: payload.post.url,
          }),
        );
        if (payload.post.shortContent) sentences.push(blockUtils.createPostContentQuote(payload.post));
      }
      sentences.forEach(sentence => blocks.push(blockUtils.createTextSection(sentence)));

      if (payload.context && (payload.member || payload.space)) {
        let elements = [];
        if (payload.member) elements = elements.concat(blockUtils.createEntityContext({ title: 'Member', entity: payload.member }));
        if (payload.space) elements = elements.concat(blockUtils.createEntityContext({ title: 'Space', entity: payload.space }));
        blocks.push({
          type: 'context',
          elements,
        });
      }
      if (payload.event === 'moderation.created') {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Go to moderation',
                emoji: true,
              },
              value: 'redirect_moderation',
              url: `${payload.network.domain}/settings/moderation`,
              action_id: 'moderation-url-button',
            },
          ],
        });
      }
      this.slackClient.send({ blocks });
    } catch (err) {
      logger.error(err);
    }
  }
}

export default SlackService;
