import { getNetworkClient } from '@clients'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { SpaceJoinRequest } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleSpaceJoinRequestSubscription = async (
  webhook: SubscriptionWebhook<any>,
): Promise<void> => {
  logger.debug('handlePostSubscription called', { webhook })

  const {
    networkId,
    data: {
      verb,
      actor: { id: actorId },
      object: { spaceId, memberId },
    },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)

  const gqlClient = await getNetworkClient(networkId)
  const space = await gqlClient.query({
    name: 'space',
    args: { variables: { id: spaceId }, fields: 'basic' },
  })
  switch (verb) {
    case EventVerb.CREATED:
      await handleCreateSpaceJoinRequest({ settings, webhook })

      break
    case EventVerb.ACCEPTED:
      await handleCreateSpaceJoinRequest({ settings, webhook })
      break
    default:
      break
  }
}

export const handleCreateSpaceJoinRequest = async (options: {
  settings: NetworkSettings
  webhook: SubscriptionWebhook<SpaceJoinRequest>
}): Promise<void> => {
  const { settings, webhook } = options
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
