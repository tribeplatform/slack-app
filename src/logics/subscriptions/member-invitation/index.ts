import { getMember } from '@/utils/query.utils'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { MemberInvitation, Network } from '@tribeplatform/gql-client/types'
import { blockUtils, globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'
const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleMemberInvitationSubscription = async (
  webhook: SubscriptionWebhook<MemberInvitation>,
): Promise<void> => {
  logger.debug('handleMemberInvitationSubscription called')

  const {
    networkId,
    data: {
      verb,
      name,
      object: { inviteeName, inviterId },
      target: { networkDomain },
    },
    entities: { network },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const sentences = []

  switch (verb) {
    case EventVerb.CREATED:
      const actor = await getMember({ networkId, memberId: inviterId })
      sentences.push(
        `${blockUtils.createMemberEntityHyperLink(actor, {
          networkDomain,
          memberId: inviterId,
        })} invited ${inviteeName} to the community`,
      )
      break

    default:
      break
  }
  await handleMemberInvitationEvent({ settings, network, sentences, name })
}

export const handleMemberInvitationEvent = async (options: {
  settings: NetworkSettings
  network: Network
  sentences: string[]
  spaceId?: string
  name: string
}): Promise<void> => {
  logger.log('handleMemberInvitationEvent called')
  const { settings, network, sentences, name } = options
  await handleCreateEvent({
    settings,
    sentences,
    network,
    name,
  })
}
