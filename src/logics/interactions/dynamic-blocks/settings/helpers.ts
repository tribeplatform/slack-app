import { getNetworkClient, getSlackBotClient } from '@clients'
import { InteractionType, WebhookStatus, WebhookType } from '@enums'
import { Interaction, InteractionWebhookResponse } from '@interfaces'
import { NetworkSettings, PrismaClient } from '@prisma/client'
import { rawSlateToDto } from '@tribeplatform/slate-kit/utils'
import { globalLogger } from '@utils'
import { randomUUID } from 'crypto'
import { ChannelFieldOption, connectionInfo } from './constants'
import { getNotConnectedSettingsSlate } from './slates'
import { getConnectedSettingsSlate } from './slates/connected-settings.slate'

const logger = globalLogger.setContext(`SettingsDynamicBlock`)

export const getConnectedSettingsResponse = async (options: {
  interactionId: string
  settings: NetworkSettings
  connections: connectionInfo[]
}): Promise<InteractionWebhookResponse> => {
  const { interactionId, settings, connections } = options

  const slate = getConnectedSettingsSlate({
    settings,
    connections,
  })
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId,
          type: InteractionType.Show,
          slate: rawSlateToDto(slate),
        },
      ],
    },
  }
}

export const getDisconnectedSettingsResponse = async (options: {
  interactionId: string
  revokeInteractions?: boolean
}): Promise<InteractionWebhookResponse> => {
  const { interactionId, revokeInteractions } = options
  const slate = getNotConnectedSettingsSlate()
  var interactions: Interaction[]
  if (revokeInteractions) {
    interactions = [
      {
        id: interactionId,
        type: InteractionType.Close,
      },
      {
        id: interactionId + randomUUID(),
        type: InteractionType.Reload,
        props: {
          dynamicBlockKeys: ['settings'],
        },
      },
      {
        id: interactionId + randomUUID(),
        type: InteractionType.Show,
        slate: rawSlateToDto(slate),
      },
    ]
  } else {
    interactions = [
      {
        id: interactionId,
        type: InteractionType.Show,
        slate: rawSlateToDto(slate),
      },
    ]
  }
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions,
    },
  }
}

export const getConnectionInfoBundles = async (options: {
  settings: NetworkSettings
}): Promise<connectionInfo[]> => {
  const { settings } = options
  const { networkId } = settings
  const [gqlClient, slackClient, prisma] = await Promise.all([
    getNetworkClient(settings.networkId),
    getSlackBotClient(settings),
    new PrismaClient(),
  ])
  const connections = await prisma.connection.findMany({ where: { networkId } })

  //query to get spaces, channels, and member info
  var [spaces, channels] = await Promise.all([
    gqlClient.query({
      name: 'spaces',
      args: {
        variables: {
          limit: 20,
          // after:
        },
        fields: {
          nodes: 'basic',
          // edges: 'basic',
          // pageInfo: 'basic',
        },
      },
    }),
    slackClient.getChannels(),
  ])

  const channelOptions: ChannelFieldOption[] = channels?.channels?.map(channel => ({
    text: `${channel.is_channel ? '#' : '@'}${channel.name}`,
    value: channel.id,
  }))

  const spacesOptions: ChannelFieldOption[] = spaces?.nodes?.map(space => ({
    text: space.name,
    value: space.id,
  }))

  var connectionBundles: connectionInfo[] = []

  for (const connectionKey in connections) {
    const connection = connections[connectionKey]
    const connectionInfoBundle: connectionInfo = {
      memberName: '',
      channelName: '',
      spaceName: '',
      createDate: undefined,
      id: '',
    }

    const channelOption = channelOptions.find(
      option => option.value === connection.channelId,
    )
    if (channelOption) {
      connectionInfoBundle.channelName = channelOption.text
    }

    const spaceIds = connection.spaceIds
    for (const spaceId of spaceIds) {
      const spaceOption = spacesOptions.find(option => option.value === spaceId)
      if (spaceOption) {
        connectionInfoBundle.spaceName = spaceOption.text
      }
    }

    try {
      const memberInfo = await gqlClient.query({
        name: 'member',
        args: {
          variables: { id: connection.memberId },
          fields: 'basic',
        },
      })
      connectionInfoBundle.memberName = memberInfo.name
    } catch (err) {
      logger.error(err)
    }

    connectionInfoBundle.createDate = connection.createdAt

    connectionInfoBundle.id = connection.id

    connectionBundles.push(connectionInfoBundle)
  }
  return connectionBundles
}
