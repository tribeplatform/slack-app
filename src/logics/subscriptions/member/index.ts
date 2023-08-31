import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Member } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleMemberSubscription = async (
  webhook: SubscriptionWebhook<Member>,
): Promise<void> => {
  logger.debug('handleMemberSubscription called', { webhook })

  const {
    networkId,
    data: {
      verb,
      object: { id },
    },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  switch (verb) {
    case EventVerb.CREATED:
      await handleCreateMemberEvent({ settings, webhook })
      break
    case EventVerb.VERIFIED:
      await handleCreateMemberEvent({ settings, webhook })
      break
    default:
      break
  }
}

export const handleCreateMemberEvent = async (options: {
  settings: NetworkSettings
  webhook: SubscriptionWebhook<Member>
}): Promise<void> => {
  const { settings, webhook } = options
  logger.verbose('handleCreateMemberInvitation called', { webhook })
  const {
    data: { object, verb, actor },
  } = webhook
  const { id: actorId } = actor
  const { id: postId } = object

  await handleCreateEvent({
    settings,
    verb,
    postId,
    actorId,
  })
}
