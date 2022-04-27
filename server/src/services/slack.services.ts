import { logger } from '@/utils/logger';
import { IncomingWebhook } from '@slack/webhook';
import { Liquid } from 'liquidjs';
import slackify from 'slackify-html';
interface Options {
  url: string;
}
const NEW_POST_TEMPLATE = `
  {
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "{% if post.title  != blank %}*<{{ post.url }}|{{ post.title }}>*\\n{% endif %}{% if post.content != blank %}{{ post.content }}{% endif %}"
        }
        {% if post.image != blank %}
        ,"accessory": {
          "type": "image",
          "image_url": "{{ post.image }}",
          "alt_text": "{{ post.title }}"
        }
        {% endif %}
      },
      {
        "type": "context",
        "elements": [
          {% if author != blank %}
            {% if author.profilePicture != blank %}
            {
              "type": "image",
              "image_url": "{{ author.profilePicture }}",
              "alt_text": "{{ author.name }}"
            },{% endif %}
            {
              "type": "mrkdwn",
              "text": "Author: <{{ author.url }}|{{ author.name }}>"
            },
          {% endif %}
          {% if space != blank %}
            {% if space.image != blank %}
            {
              "type": "image",
              "image_url": "{{ space.image }}",
              "alt_text": "{{ space.name }}"
            },
            {% endif %}
            {
              "type": "mrkdwn",
              "text": "*Space*: <{{ space.url }}|{{ space.name }}>"
            }
          {% endif %}
        ]
      }
    ]
  }
`;
class SlackService {
  private slackClient: IncomingWebhook;

  constructor(options: Options | string) {
    const url = typeof options === 'string' ? options : options.url;
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
  private generateSlackMessage(options) {
    const engine = new Liquid();
    if (options?.post?.content) options.post.content = slackify(options.post.content);
    const renderedMessage = engine.parseAndRenderSync(NEW_POST_TEMPLATE, { ...options, v: 'Liquid' });
    return JSON.parse(renderedMessage);
  }
  public async sendNewPostMessage(options) {
    try {
      return this.slackClient.send(this.generateSlackMessage(options));
    } catch (err) {
      logger.error(err);
    }
  }
}

export default SlackService;
