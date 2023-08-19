import { ErrorCode, WebhookStatus, WebhookType } from '@enums'
import { InteractionWebhook, InteractionWebhookResponse } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { PermissionContext } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

import { getInteractionNotSupportedError } from '../../../error.logics'

import { getNetworkClient, getSlackBotClient } from '@clients'
import { PrismaClient } from '@prisma/client'
import { getCallbackResponse } from './callback.logics'
import { ChannelFieldOption } from './constants'
import { getConnectedSettingsResponse, getDisconnectedSettingsResponse } from './helpers'

const logger = globalLogger.setContext(`SettingsDynamicBlock`)

const getNetworkSettingsInteractionResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getNetworkSettingsInteractionResponse called', { webhook })

  const {
    networkId,
    data: { interactionId, callbackId },
  } = webhook

  if (callbackId) {
    return getCallbackResponse(webhook)
  }
  const settings = await NetworkSettingsRepository.findUnique(networkId)

  if (!settings) {
    return getDisconnectedSettingsResponse({
      interactionId,
    })
  }

  if (!interactionId) {
    return {
      type: WebhookType.Interaction,
      status: WebhookStatus.Failed,
      errorCode: ErrorCode.InvalidRequest,
      errorMessage: 'Interaction ID is required.',
    }
  }

  const prisma = new PrismaClient()
  const connections = await prisma.connection.findMany()

  const [gqlClient, slackClient] = await Promise.all([
    getNetworkClient(settings.networkId),
    getSlackBotClient(settings),
  ])
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
  // spaces.edges[0].cursor
  // spaces.pageInfo.endCursor
  // logger.log('spaces', spaces)
  // const spacesMaped = spaces.nodes.map(space => ({ value: space.id, text: space.name }))

  const channelOptions: ChannelFieldOption[] = channels?.channels?.map(channel => ({
    text: `${channel.is_channel ? '#' : '@'}${channel.name}`,
    value: channel.id,
  }))

  const spacesOptions: ChannelFieldOption[] = spaces?.nodes?.map(space => ({
    text: space.name,
    value: space.id,
  }))

  const channelNames: string[] = []
  const spaceNames: string[] = []

  for (const connectionKey in connections) {
    const connection = connections[connectionKey]

    const channelOption = channelOptions.find(
      option => option.value === connection.channelId,
    )
    if (channelOption) {
      channelNames.push(channelOption.text)
    }

    const spaceIds = connection.spaceIds.split(',')
    for (const spaceId of spaceIds) {
      const spaceOption = spacesOptions.find(option => option.value === spaceId)
      if (spaceOption) {
        spaceNames.push(spaceOption.text)
      }
    }
  }
  //if (spaceOption) {
  //   if (spaceOption.value === 'undefined') {
  //     spaceNames.push('All Spaces')
  //   } else {
  //     spaceNames.push(spaceOption.text)
  //   }
  // }
  return getConnectedSettingsResponse({
    interactionId,
    settings,
    connections,
    channelNames,
    spaceNames,
  })
}

export const getSettingsInteractionResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getSettingsInteractionResponse called', { webhook })

  const { context } = webhook

  switch (context) {
    case PermissionContext.NETWORK:
      return getNetworkSettingsInteractionResponse(webhook)
    default:
      return getInteractionNotSupportedError('context', context)
  }
}
