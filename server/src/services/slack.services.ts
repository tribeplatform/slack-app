import { IncomingWebhook } from '@slack/webhook';

interface Options {
  url: string;
}
class SlackService {
  private slackClient: IncomingWebhook;

  constructor(options: Options | string) {
    const url = typeof options === 'string' ? options : options.url
    this.slackClient = new IncomingWebhook(url);
  }

  public async sendWelcomeMessage() {
    return this.slackClient.send({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Hi there, *Community Bot* is here! I would inform you on community updates in this channel.',
          },
        },
      ],
    });
  }
}

export default SlackService;
