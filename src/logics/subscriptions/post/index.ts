import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Post } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

import { handleCreatePostEvent } from '../helpers.logics'

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
  const {
    eventsSettings: { enabled: eventsEnabled },
  } = settings
  switch (verb) {
    case EventVerb.PUBLISHED:
      if (eventsEnabled) {
        await handleCreatePostEvent({ settings, webhook })
      }
      break
    default:
      break
  }
}
