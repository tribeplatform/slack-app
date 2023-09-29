import { getMember } from '@/utils/query.utils'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Network, Space } from '@tribeplatform/gql-client/types'
import { blockUtils, globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'
const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleSpaceMembershipSubscription = async (
  webhook: SubscriptionWebhook<Space>,
): Promise<void> => {
  logger.debug('handleSpaceMemberShipSubscription called')

  const {
    networkId,
    entities,
    data: {
      target: { networkDomain, memberId, spaceId },
      actor: { id: actorId },
      verb,
      name,
    },
  } = webhook
  const { network, space, targetMember } = entities
  const { id: targetMemberId } = targetMember
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const sentences = []
  // console.log('actorId: ', actorId, 'memberId: ', memberId)
  // const member = await getMember({ networkId, memberId })
  // const actor = await getMember({ networkId, memberId: actorId })
  switch (verb) {
    case EventVerb.CREATED:
      if (actorId === memberId) {
        sentences.push(
          `${blockUtils.createMemberEntityHyperLink(targetMember, {
            networkDomain,
            memberId: targetMemberId,
          })} joined ${blockUtils.createEntityHyperLink(space)}`,
        )
      } else {
        const actor = await getMember({ networkId, memberId: actorId })
        sentences.push(
          `${blockUtils.createMemberEntityHyperLink(actor, {
            networkDomain,
            memberId: actorId,
          })} added ${blockUtils.createMemberEntityHyperLink(targetMember, {
            networkDomain,
            memberId: targetMemberId,
          })} to ${blockUtils.createEntityHyperLink(space)}`,
        )
      }
      break

    case EventVerb.DELETED:
      if (targetMember.name == 'member:deleted.name') {
        break
      } else {
        if (actorId === memberId) {
          sentences.push(
            `${blockUtils.createMemberEntityHyperLink(targetMember, {
              networkDomain,
              memberId: targetMemberId,
            })} left ${blockUtils.createEntityHyperLink(space)}`,
          )
        } else {
          const actor = await getMember({ networkId, memberId: actorId })
          sentences.push(
            `${blockUtils.createMemberEntityHyperLink(actor, {
              networkDomain,
              memberId: actorId,
            })} removed ${blockUtils.createMemberEntityHyperLink(targetMember, {
              networkDomain,
              memberId: targetMemberId,
            })} from ${blockUtils.createEntityHyperLink(space)}`,
          )
        }
      }

      break

    default:
      break
  }
  await handleCreateSpaceMembershipEvent({
    settings,
    network,
    sentences,
    spaceId,
    name,
  })
}

export const handleCreateSpaceMembershipEvent = async (options: {
  settings: NetworkSettings
  network: Network
  sentences: string[]
  spaceId?: string
  name: string
}): Promise<void> => {
  const { settings, network, sentences, spaceId, name } = options
  await handleCreateEvent({
    settings,
    sentences,
    spaceId,
    network,
    name,
  })
}
