import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { Member } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

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
  const {
    contactsSettings: { create, fieldCategory },
    eventsSettings: { enabled: eventsEnabled },
  } = settings
  if (!fieldCategory) return
  switch (verb) {
    // case EventVerb.UPDATED:
    //   if (create) {
    //     await handleUpsertContact({ settings, memberId: id })
    //   }
    //   break
    // case EventVerb.VERIFIED:
    //   if (create) {
    //     await handleUpsertContact({ settings, memberId: id })
    //   }
    //   if (eventsEnabled) {
    //     await handleCreateMemberEvent({
    //       settings,
    //       webhook,
    //       title: 'Joined the community',
    //     })
    //   }
    //   break
    // case EventVerb.DELETED:
    //   if (eventsEnabled) {
    //     await handleCreateMemberEvent({ settings, webhook, title: 'Left the community' })
    //   }
    //   break
    default:
      break
  }
}
