import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { Member } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handleVerifyMember = async (options: {
  settings: NetworkSettings
  webhook: SubscriptionWebhook<Member>
}): Promise<void> => {
  const { settings, webhook } = options
  logger.verbose('handleVerifyMember called', { webhook })

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
