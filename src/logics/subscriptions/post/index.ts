import { getNetworkClient } from '@clients'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Post } from '@tribeplatform/gql-client/types'
import { blockUtils, globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`Handle Post Subscription`)

export const handlePostSubscription = async (
  webhook: SubscriptionWebhook<Post>,
): Promise<void> => {
  // logger.log(webhook)

  const {
    networkId,
    data: { actor, verb, object },
    entities,
  } = webhook
  const { id: postId, spaceId } = object
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const gqlClient = await getNetworkClient(networkId)
  var post_: Post
  // if (postId) {
  //   const post = await gqlClient.query({
  //     name: 'post',
  //     args: { variables: { id: postId }, fields: 'basic' },
  //   })
  //   p = post
  // }
  logger.log(p)
  switch (verb) {
    case EventVerb.PUBLISHED:
      // console.log(entities)
      const message: string = `:bell: ${blockUtils.createEntityHyperLink(
        entities.owner,
      )} added a ${object.repliedToId ? 'reply' : 'post'}`
      await handleCreateEvent({ settings, verb, entities, message, postId })
      // await handleCreatePostEvent({ settings, webhook })
      break
    default:
      break
  }
}

export const handleCreatePostEvent = async (options: {
  settings: NetworkSettings
  webhook: SubscriptionWebhook<Post>
}): Promise<void> => {
  const { settings, webhook } = options
  const {
    data: { object, verb, actor },
  } = webhook
  const { data } = webhook
  const { id: actorId } = actor
  const { id: postId, spaceId } = object
  // logger.log(webhook)
  await handleCreateEvent({
    settings,
    verb,
    postId,
    spaceId,
    actorId,
  })
}
