import { NetworkSettings } from '@prisma/client'
import { ConnectionRepository } from '@repositories'
import { Network } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

import { sendSlackMessage } from '@/services'

const logger = globalLogger.setContext('MemberSubscriptionHelpers')

export const handleCreateEvent = async (options: {
  settings: NetworkSettings
  spaceId?: string
  sentences: string[]
  context?: any[]
  actions?: any[]
  network: Network
}): Promise<void> => {
  logger.debug('handleCreateEvent called', { options })

  const { settings, spaceId, sentences, context, actions, network } = options
  const { networkId } = settings
  const connections = await ConnectionRepository.findMany({
    where: { networkId },
  }).then(connections =>
    connections.filter(
      con => !con.spaceIds.length || (spaceId && con.spaceIds.includes(spaceId)),
    ),
  )

  for (const connection of connections) {
    await sendSlackMessage({
      channel: connection.channelId,
      sentences,
      context,
      actions,
      settings,
      network,
    })
  }
}
