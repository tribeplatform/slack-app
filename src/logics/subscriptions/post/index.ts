import { getSlackBotClient } from '@clients'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings, PrismaClient } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Post } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

const logger = globalLogger.setContext(`NetworkSubscription`)

export const handlePostSubscription = async (
  webhook: SubscriptionWebhook<Post>,
): Promise<void> => {
  logger.debug('handlePostSubscription called', { webhook })

  const {
    networkId,
    data: { verb },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)

  switch (verb) {
    case EventVerb.PUBLISHED:
      await handleCreatePostEvent({ settings, webhook })
      break
    default:
      break
  }
}

export const handleCreatePostEvent = async (options: {
  settings: NetworkSettings
  webhook: SubscriptionWebhook<Post>
}) => {
  const { settings, webhook } = options
  const { networkId, memberId } = settings
  const {
    data: { object },
  } = webhook
  const { spaceId, status, title, fields } = object
  const content = object.fields.find(field => field.key === 'content')
  console.log(content)
  const slackClient = await getSlackBotClient(settings)
  const prisma = new PrismaClient()
  const connections = await prisma.connection.findMany({ where: { networkId } })

  for (const connection of connections) {
    //he i gotta do send slack message using the slack services
    await slackClient.postMessage({
      channel: connection.channelId,
      text: 'title:' + String(title) + '\n Content' + String(content),
    })
  }

  console.log(settings)

  return null
}
