// import { createLogger } from '@/utils/logger';
import { PostMessageArguments, UpdateMessagePayload } from '@/interfaces/slack.interface'
import { ChatPostMessageArguments, WebClient } from '@slack/web-api'
import { Types } from '@tribeplatform/gql-client'
import { Logger } from '@tribeplatform/node-logger'
import * as blockUtils from '../utils/blockParser'

class SlackService {
  private slackClient: WebClient
  private readonly logger: Logger
  constructor(token: string) {
    this.slackClient = new WebClient(token)
    // this.logger = createLogger(SlackService.name)
  }
  public async postMessage({
    text,
    blocks,
    channel,
    username,
    image,
  }: PostMessageArguments) {
    if (!Array.isArray(blocks)) blocks = [blocks]
    const payload: ChatPostMessageArguments = {
      channel,
      blocks,
      text,
    }
    if (username) payload.username = username
    if (image) payload.icon_url = image
    return this.slackClient.chat.postMessage(payload)
  }
  public async sendWelcomeMessage(args) {
    return this.postMessage({
      ...args,
      text: 'Community Bot is connected',
      blocks: blockUtils.createTextSection(
        'Hi there, *Community Bot* is here! I would inform you on community updates in this channel.',
      ),
    })
  }
  public async sendSlackMessage(channel: string, payload: UpdateMessagePayload) {
    try {
      const blocks = []
      const sentences = []
      switch (payload.event) {
        case 'post.published':
          sentences.push(
            `${blockUtils.createEntityHyperLink(payload.member)} added a ${
              payload.post.repliedToId ? 'reply' : 'post'
            }`,
          )
          break
        case 'member.verified':
          sentences.push(
            `${blockUtils.createEntityHyperLink(payload.member)} joined the community`,
          )
          break
        case 'moderation.created':
          if (payload.post) {
            sentences.push(`A post flagged for moderation`)
          } else
            sentences.push(
              `${blockUtils.createEntityHyperLink(
                payload.member,
              )} was flagged for moderation`,
            )
          break
        case 'moderation.rejected':
          if (payload.post) {
            sentences.push(
              `${blockUtils.createEntityHyperLink(payload.actor)} approved this post`,
            )
          }
          break
        case 'moderation.accepted':
          if (payload.post) {
            sentences.push(
              `${blockUtils.createEntityHyperLink(payload.actor)} rejected this post`,
            )
          }
          break
        case 'space_membership.created':
          if (payload?.member?.id === payload?.actor?.id) {
            sentences.push(
              `${blockUtils.createEntityHyperLink(
                payload.member,
              )} joined ${blockUtils.createEntityHyperLink(payload.space)}`,
            )
          } else {
            sentences.push(
              `${blockUtils.createEntityHyperLink(
                payload.actor,
              )} added ${blockUtils.createEntityHyperLink(
                payload.member,
              )} to ${blockUtils.createEntityHyperLink(payload.space)}`,
            )
          }
          break
        case 'space_membership.deleted':
          if (payload?.member?.id === payload?.actor?.id) {
            sentences.push(
              `${blockUtils.createEntityHyperLink(
                payload.member,
              )} left ${blockUtils.createEntityHyperLink(payload.space)}`,
            )
          } else {
            sentences.push(
              `${blockUtils.createEntityHyperLink(
                payload.actor,
              )} removed ${blockUtils.createEntityHyperLink(
                payload.member,
              )} from ${blockUtils.createEntityHyperLink(payload.space)}`,
            )
          }
          break
        case 'space_join_request.created':
          sentences.push(
            `${blockUtils.createEntityHyperLink(
              payload.member,
            )} requested to join ${blockUtils.createEntityHyperLink(payload.space)}`,
          )
          break
        case 'space_join_request.accepted':
          sentences.push(
            `${blockUtils.createEntityHyperLink(
              payload.actor,
            )} accepted ${blockUtils.createEntityHyperLink(
              payload.member,
            )}'s join request to ${blockUtils.createEntityHyperLink(payload.space)}`,
          )
          break
        case 'member_invitation.created':
          sentences.push(
            `${blockUtils.createEntityHyperLink(payload.actor)} invited ${
              payload?.member?.name
            } to the community`,
          )
          break
      }
      const text = sentences[0]
      sentences[0] = ':bell: ' + text
      if (payload.post) {
        const parent = payload.post?.repliedTos?.length
          ? payload.post?.repliedTos.find(post => !post.repliedToId)
          : payload.post
        if (parent?.title) {
          sentences[0] =
            sentences[0] +
            '\n' +
            blockUtils.createHyperlink({
              text: parent.title,
              url: payload.post.url,
            })
        }
        if (payload.post.shortContent) {
          const parsed = blockUtils.parseHtml(
            utils.transformMentions(
              payload.post.shortContent,
              `https://${payload.network.domain}/member/`,
            ),
          )
          if (parsed && parsed.length) sentences.push(blockUtils.createQuote(parsed))
        }
      }
      sentences.forEach(sentence => blocks.push(blockUtils.createTextSection(sentence)))

      if (payload.context && (payload.member || payload.space)) {
        let elements = []
        if (payload.member) {
          const image = (payload.member.profilePicture as Types.Image)?.url
          const emoji = (payload.member.profilePicture as Types.Emoji)?.text
          elements = elements.concat(
            blockUtils.createEntityContext({
              title: 'Member',
              emoji,
              image,
              entity: payload.member,
            }),
          )
        }
        if (payload.space) {
          const image = (payload.space.image as Types.Image)?.url
          const emoji = (payload.space.image as Types.Emoji)?.text
          elements = elements.concat(
            blockUtils.createEntityContext({
              title: 'Space',
              emoji,
              image,
              entity: payload.space,
            }),
          )
        }
        blocks.push({
          type: 'context',
          elements,
        })
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
              url: `https://${payload.network.domain}/settings/moderation`,
            },
          ],
        })
      }

      const image = (payload.network?.favicon as Types.Image)?.urls?.small
      return this.postMessage({
        text,
        blocks,
        channel,
        username: payload.network?.name,
        image,
      })
    } catch (err) {
      this.logger.error(err)
    }
  }
}

export default SlackService
