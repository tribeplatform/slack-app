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
  context?: boolean,
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
          sentences.push(
            blockUtils.createHyperlink({
              text: payload.post.repliedTo ? payload.post.repliedTo.title : payload.post.title,
              url: payload.post.url,
            }),
          );
          sentences.push(blockUtils.createPostContentQuote(payload.post));
          break;
        case 'member.verified':
          sentences.push(
            `${blockUtils.createEntityHyperLink(payload.member)} joined the community`,
          );
          break
        
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
      console.log(JSON.stringify({ blocks }));
      this.slackClient.send({ blocks });
    } catch (err) {
      logger.error(err);
    }
  }
}

export default SlackService;
