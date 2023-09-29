import { getMember, getPost } from '@/utils/query.utils'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Member, ModerationItem, Network } from '@tribeplatform/gql-client/types'
import { blockUtils, globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleModerationSubscription = async (
  webhook: SubscriptionWebhook<ModerationItem>,
): Promise<void> => {
  logger.log('handleModerationSubscription called')
  // logger.log('handleModerationSubscription called', { webhook })

  const {
    networkId,
    data: {
      verb,
      name,
      target: { networkDomain, postId },
      object: { spaceId },
    },
    entities,
  } = webhook
  const {
    network,
    actor: { id: actorId },
  } = entities

  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const sentences = []
  var actor: Member

  switch (verb) {
    case EventVerb.CREATED:
      sentences.push(`A post flagged for moderation`)
      var actions: any[] = [
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Go to moderation',
                emoji: true,
              },
              url: `https://${networkDomain}/settings/moderation`,
            },
          ],
        },
      ]

      break

    case EventVerb.ACCEPTED:
      actor = await getMember({ networkId, memberId: actorId })
      sentences.push(
        `${blockUtils.createMemberEntityHyperLink(actor, {
          networkDomain,
          memberId: actorId,
        })} rejected this post`,
      )
      break

    case EventVerb.REJECTED:
      actor = await getMember({ networkId, memberId: actorId })
      sentences.push(
        `${blockUtils.createMemberEntityHyperLink(actor, {
          networkDomain,
          memberId: actorId,
        })} approved this post`,
      )
      break

    default:
      break
  }
  const post = await getPost({ networkId, postId })
  sentences[0] += '\n' + `${blockUtils.createPostTitle(post)}`
  if (post.shortContent != null) {
    sentences.push(`${blockUtils.createPostContentQuote(post)}`)
  }

  // const moderation = await getModeration({ networkId, moderationId })
  // const {shortContent, moderation.post or moderation.objcet as post, }
  // logger.log(moderation)
  //sentences.push(`${blockUtils.createPostTitle(object as Post)}`)
  // if (shortContent != null) {
  //   sentences.push(`${blockUtils.createPostContentQuote(object as Post)}`)
  // }
  await handleModerationEvent({ settings, network, sentences, spaceId, name }) //actions
}

export const handleModerationEvent = async (options: {
  settings: NetworkSettings
  network: Network
  sentences: string[]
  spaceId?: string
  actions?: any[]
  name: string
}): Promise<void> => {
  logger.log('handleModerationEvent called')
  const { settings, network, sentences, spaceId, actions, name } = options
  // console.log('options: \n', options)
  await handleCreateEvent({
    settings,
    sentences,
    spaceId,
    actions,
    network,
    name,
  })
}
