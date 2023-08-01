import { ErrorCode, WebhookStatus } from '@enums'
import { GeneralWebhookResponse, SubscriptionWebhook } from '@interfaces'
import { EventNoun } from '@tribeplatform/gql-client/global-types'
import { Member, Network, Post } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

import { handleMemberSubscription } from './member'
import { handleNetworkSubscription } from './network'
import { handlePostSubscription } from './post'
import { handleSpaceMembershipSubscription } from './space-membership'

const logger = globalLogger.setContext(`Subscription`)

export const handleSubscriptionWebhook = async (
  webhook: SubscriptionWebhook,
): Promise<GeneralWebhookResponse> => {
  logger.debug('handleSubscriptionWebhook called', { webhook })

  const {
    data: { noun },
  } = webhook

  try {
    switch (noun) {
      case EventNoun.NETWORK:
        await handleNetworkSubscription(webhook as SubscriptionWebhook<Network>)
        break
      case EventNoun.MEMBER:
        await handleMemberSubscription(webhook as SubscriptionWebhook<Member>)
        break
      case EventNoun.POST:
        await handlePostSubscription(webhook as SubscriptionWebhook<Post>)
        break
      case EventNoun.SPACE_MEMBERSHIP:
        await handleSpaceMembershipSubscription(webhook as SubscriptionWebhook<any>)
        break
      default:
        break
    }
  } catch (error) {
    logger.error(error)
    return {
      type: webhook.type,
      status: WebhookStatus.Failed,
      errorCode: error.code || ErrorCode.ServerError,
      errorMessage: error.message,
    }
  }

  return {
    type: webhook.type,
    status: WebhookStatus.Succeeded,
  }
}
