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
    data: {
      target: { networkDomain },
      object: { id: memberId },
      object,
      verb,
      name,
    },
    entities: { network },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const sentences = []
  switch (verb) {
    case EventVerb.VERIFIED:
      sentences.push(
        `${blockUtils.createMemberEntityHyperLink(object, {
          networkDomain,
          memberId: memberId,
        })} joined the community`,
      )
      break

    default:
      break
  }
  await handleVerifyMemberEvent({ settings, network, sentences, name })
}

export const handleVerifyMemberEvent = async (options: {
  settings: NetworkSettings
  network: Network
  sentences: string[]
  spaceId?: string
  name: string
}): Promise<void> => {
  logger.log('handleVerifyMemberEvent called')
  const { settings, network, sentences, name } = options
  await handleCreateEvent({
    settings,
    sentences,
    network,
    name,
  })
}
