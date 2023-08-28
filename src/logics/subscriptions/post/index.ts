import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Post } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handlePostSubscription = async (
  webhook: SubscriptionWebhook<Post>,
): Promise<void> => {
  logger.debug('handlePostSubscription called', { webhook })

  const {
    networkId,
    data: { verb },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)

  switch (verb) {
    case EventVerb.PUBLISHED:
      await handleCreatePostEvent({ settings, webhook })
      break
    default:
      break
  }
}

export const handleCreatePostEvent = async (options: {
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
