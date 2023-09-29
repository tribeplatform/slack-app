import { getMember } from '@/utils/query.utils'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Network, SpaceJoinRequest } from '@tribeplatform/gql-client/types'
import { blockUtils, globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleSpaceJoinRequestSubscription = async (
  webhook: SubscriptionWebhook<SpaceJoinRequest>,
): Promise<void> => {
  logger.debug('Handle Space Join Request Sub Called')

  const {
    networkId,
    entities,
    data: {
      verb,
      name,
      target: { networkDomain },
      actor: { id: actorId },
      object: { spaceId },
    },
  } = webhook
  const { network, space, targetMember } = entities
  const { id: targetMemberId } = targetMember
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const sentences = []

  switch (verb) {
    case EventVerb.CREATED:
      sentences.push(
        `${blockUtils.createMemberEntityHyperLink(targetMember, {
          networkDomain,
          memberId: targetMemberId,
        })} requested to join ${blockUtils.createEntityHyperLink(space)}`,
      )
      break

    case EventVerb.ACCEPTED:
      const actor = await getMember({ networkId, memberId: actorId })
      sentences.push(
        `${blockUtils.createMemberEntityHyperLink(actor, {
          networkDomain,
          memberId: actorId,
        })}  accepted ${blockUtils.createMemberEntityHyperLink(targetMember, {
          networkDomain,
          memberId: targetMemberId,
        })}'s request to join ${blockUtils.createEntityHyperLink(space)}`,
      )
      break

    default:
      break
  }
  await handleSpaceJoinRequestEvent({ settings, network, sentences, spaceId, name })
}

export const handleSpaceJoinRequestEvent = async (options: {
  settings: NetworkSettings
  network: Network
  sentences: string[]
  spaceId?: string
  name: string
}): Promise<void> => {
  logger.log('handleSpaceJoinRequestEvent called')
  const { settings, network, sentences, spaceId, name } = options
  await handleCreateEvent({
    settings,
    sentences,
    spaceId,
    network,
    name,
  })
}
