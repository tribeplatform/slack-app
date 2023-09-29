import { Connection, NetworkSettings } from '@prisma/client'
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
  name: string
}): Promise<void> => {
  logger.debug('handleCreateEvent called', { options })

  const { settings, spaceId, sentences, context, actions, network, name } = options
  const { networkId } = settings
  var connections: Connection[]
  if (spaceId) {
    connections = await ConnectionRepository.findMany({
      where: { networkId },
    }).then(connections =>
      connections.filter(
        con =>
          con.events.includes(name) &&
          (con.spaceIds.includes('null') || con.spaceIds.includes(spaceId)),
      ),
    )
  } else {
    connections = await ConnectionRepository.findMany({
      where: { networkId },
    }).then(connections => connections.filter(con => con.events.includes(name)))
  }
  // const connectionsII: Connection[] = await ConnectionRepository.findMany({
  //   where: { networkId },
  // })

  // for (var con of connectionsII) {
  //   console.log('spaceid length', con.spaceIds.length)
  // }
  // console.log(connections)
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
