import { ErrorCode, WebhookStatus } from '@enums'
import { GeneralWebhookResponse, SubscriptionWebhook } from '@interfaces'
import { EventNoun } from '@tribeplatform/gql-client/global-types'
import { Member, Post, Space } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'
import { handleMemberSubscription } from './member'
import { handleModerationSubscription } from './moderation'
import { handlePostSubscription } from './post'
import { handleSpaceMembershipSubscription } from './space-membership'
import { handleSpaceJoinRequestSubscription } from './space_join_request'

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
      case EventNoun.POST:
        await handlePostSubscription(webhook as SubscriptionWebhook<Post>)
        break
      case EventNoun.MEMBER:
        await handleMemberSubscription(webhook as SubscriptionWebhook<Member>)
        break
      case EventNoun.MODERATION:
        await handleModerationSubscription(webhook as SubscriptionWebhook<any>)
        break
      case EventNoun.SPACE_MEMBERSHIP:
        await handleSpaceMembershipSubscription(webhook as SubscriptionWebhook<Space>)
        break
      case EventNoun.SPACE_MEMBERSHIP:
        await handleSpaceJoinRequestSubscription(webhook as SubscriptionWebhook<any>)
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
