import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Post } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'
const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleSpaceMembershipSubscription = async (
  webhook: SubscriptionWebhook<any>,
): Promise<void> => {
  logger.debug('handlePostSubscription called', { webhook })

  const {
    networkId,
    data: {
      time,
      verb,
      actor: { id: actorId },
      object: { spaceId, memberId },
    },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)

  var sentence: string
  switch (verb) {
    case EventVerb.CREATED:
      if (actorId === memberId) {
      } else {
        // await handleCreateSpaceMembershipEvent({
        //   payload,
        //   webhook,
        // })
      }
      break
    case EventVerb.DELETED:
      if (actorId === memberId) {
        // await handleCreateSpaceMembershipEvent({
        //   settings,
        //   title: `Left ${createHyperlink(space.name, space.url)}`,
        //   webhook,
        // })
      } else {
        // await handleCreateSpaceMembershipEvent({      })
      }
      break
    default:
      break
  }
}

export const handleCreateSpaceMembershipEvent = async (options: {
  settings: NetworkSettings
  webhook: SubscriptionWebhook<Post>
}): Promise<void> => {
  const { settings, webhook } = options
  const { networkId, memberId } = settings
  const {
    data: { object, verb, actor },
  } = webhook
  const { id: actorId } = actor
  const { id: postId, spaceId } = object

  await handleCreateEvent({
    settings,
    verb,
    postId,
    spaceId,
    actorId,
  })
}
