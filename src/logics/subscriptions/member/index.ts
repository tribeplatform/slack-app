import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Member } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'
import { handleCreateMemberInvitation } from './created.logics'
import { handleVerifyMember } from './verified.logics'

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
      await handleCreateMemberInvitation({ settings, webhook })
      break
    case EventVerb.VERIFIED:
      await handleVerifyMember({ settings, webhook })
      break
    default:
      break
  }
}
