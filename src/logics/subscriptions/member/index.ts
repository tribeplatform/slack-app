import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Member, Network } from '@tribeplatform/gql-client/types'
import { blockUtils, globalLogger } from '@utils'

import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleMemberSubscription = async (
  webhook: SubscriptionWebhook<Member>,
): Promise<void> => {
  logger.debug('handleMemberSubscription called', { webhook })

  const {
    networkId,
    data: { verb, object },
    entities: { network },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const sentences = []
  switch (verb) {
    case EventVerb.VERIFIED:
      sentences.push(
        `${blockUtils.createEntityHyperLink(object as Member)} joined the community`,
      )
      await handleCreateMemberEvent({ settings, network, sentences })
      break
    default:
      break
  }
}

export const handleCreateMemberEvent = async (options: {
  settings: NetworkSettings
  network: Network
  sentences: string[]
}): Promise<void> => {
  const { settings, network, sentences } = options
  await handleCreateEvent({
    settings,
    sentences,
    spaceId: null,
    network,
  })
}
