import { getNetworkClient } from '@clients'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { createHyperlink, globalLogger } from '@utils'

import { handleCreateSpaceMembershipEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleSpaceMembershipSubscription = async (
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
  const {
    eventsSettings: { enabled: eventsEnabled },
  } = settings
  if (!eventsEnabled) return
  const gqlClient = await getNetworkClient(networkId)
  const space = await gqlClient.query({
    name: 'space',
    args: { variables: { id: spaceId }, fields: 'basic' },
  })
  switch (verb) {
    case EventVerb.CREATED:
      if (eventsEnabled && actorId === memberId) {
        await handleCreateSpaceMembershipEvent({
          settings,
          title: `Joined ${createHyperlink(space.name, space.url)}`,
          webhook,
        })
      }
      break
    case EventVerb.DELETED:
      if (eventsEnabled && actorId === memberId) {
        await handleCreateSpaceMembershipEvent({
          settings,
          title: `Left ${createHyperlink(space.name, space.url)}`,
          webhook,
        })
      }
      break
    default:
      break
  }
}
