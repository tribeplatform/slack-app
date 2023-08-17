import { getNetworkClient, getSlackBotClient } from '@clients'
import { InteractionType, WebhookStatus, WebhookType } from '@enums'
import {
  InteractionWebhook,
  InteractionWebhookResponse,
  RedirectInteractionProps,
} from '@interfaces'
import { ConnectionRepository, NetworkSettingsRepository } from '@repositories'
import { rawSlateToDto } from '@tribeplatform/slate-kit/utils'
import { globalLogger } from '@utils'

import {
  getInteractionNotSupportedError,
  getServiceUnavailableError,
} from '../../../error.logics'

import { ChannelFieldOption, ChannelFieldType, SettingsBlockCallback } from './constants'
import { getDisconnectedSettingsResponse } from './helpers'
import { getChannelModalSlate } from './slates/channel-modal.slate'

import { getConnectSlackUrl } from '@/logics'
import { PrismaClient } from '@prisma/client'
import { randomBytes, randomUUID } from 'crypto'
import { getConnectionRemoveModalSlate } from './slates/remove-connection-modal.slate'

const logger = globalLogger.setContext(`SettingsDynamicBlock`)

const getRedirectCallbackResponse = async ({
  props,
  interactionId,
}: {
  props: RedirectInteractionProps
  interactionId?: string
}): Promise<InteractionWebhookResponse> => ({
  type: WebhookType.Interaction,
  status: WebhookStatus.Succeeded,
  data: {
    interactions: [
      {
        id: interactionId || 'new-interaction-id',
        type: InteractionType.Redirect,
        props,
      },
    ],
  },
})

const getAuthRedirectCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getAuthRedirectCallbackResponse called', { webhook })
  const {
    networkId,
    data: { actorId },
  } = webhook
  const gqlClient = await getNetworkClient(networkId)
  const network = await gqlClient.query({
    name: 'network',
    args: 'basic',
  })
  return getRedirectCallbackResponse({
    props: {
      url: await getConnectSlackUrl({
        network,
        actorId,
      }),
      external: false,
    },
  })
}

const getAuthRevokeCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getAuthRedirectCallbackResponse called', { webhook })
  logger.debug('handleUninstalledWebhook called', { webhook })
  const {
    networkId,
    data: { interactionId },
  } = webhook
  try {
    await NetworkSettingsRepository.delete(networkId)
  } catch (error) {
    logger.error(error)
    return getServiceUnavailableError(webhook)
  }

  return getDisconnectedSettingsResponse({ interactionId })
}

export const getOpenConnectionModalCallbackResponse = async (
  webhook: InteractionWebhook,
  connectionId?: string,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: { interactionId, appId },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
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

  const channelOptions: ChannelFieldOption[] = channels?.channels?.map(channel => ({
    text: `${channel.is_channel ? '#' : '@'}${channel.name}`,
    value: channel.id,
  }))

  const spacesOptions: ChannelFieldOption[] = spaces?.nodes?.map(space => ({
    text: space.name,
    value: space.id,
  }))

  var savedSpaces: string //string[]
  var savedChannels: string //string[]

  if (connectionId) {
    const client = new PrismaClient()
    const connection = client.connection.findUnique({ where: { id: connectionId } })
    savedSpaces = (await connection).spaceIds
    savedChannels = (await connection).channelId
  }

  const slate = getChannelModalSlate(
    randomUUID(),
    [
      {
        id: 'channel',
        type: ChannelFieldType.Select,
        label: 'Channel',
        options: channelOptions,
        isSearchable: true,
        dataCallbackId: SettingsBlockCallback.SearchSlackChannel,
        defaultValue:
          typeof savedChannels != 'undefined' && savedChannels ? savedChannels : null,
        appId,
      },
      {
        id: 'spaces',
        type: ChannelFieldType.Select,
        label: 'Spaces',
        options: spacesOptions,
        isSearchable: true,
        dataCallbackId: SettingsBlockCallback.SearchSlackChannel,
        // defaultValue: spacesOptions[0].value,
        defaultValue:
          typeof savedSpaces != 'undefined' && savedSpaces ? savedSpaces : null,
        appId,
      },
    ],
    {
      callbackId:
        typeof connectionId != 'undefined' && connectionId
          ? SettingsBlockCallback.UpsertConnection + connectionId
          : SettingsBlockCallback.UpsertConnection,
      action: {
        autoDisabled: false,
        text: 'Submit',
        variant: 'primary',
        enabled: true,
      },
    },
  )
  //SettingsBlockCallback.UpsertConnection
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId,
          type: InteractionType.OpenModal,
          props: {
            title: 'Create a new channel',
            size: 'md',
          },
          slate: rawSlateToDto(slate),
        },
      ],
    },
  }
}

export const getUpsertConnectionCallbackResponse = async (
  webhook: InteractionWebhook,
  connectionId?: string,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: {
      actorId,
      interactionId,
      inputs: { channel, spaces },
    },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  logger.log('getUpsertConnectionCallbackResponse called', { webhook })

  //if it was a new connection
  if (!connectionId) {
    //grab all the id's to existing connections
    const client = new PrismaClient()
    const allConnections = await client.connection.findMany()
    const allConnectionIds = allConnections.map(connection => connection.id)
    var randomId: string //create a  new  id
    do {
      //create a new connection id
      const bytes = randomBytes(12)
      randomId = bytes.toString('hex')
    } while (allConnectionIds.includes(randomId))
    connectionId = randomId
  }

  await ConnectionRepository.upsert(connectionId, {
    memberId: String(actorId),
    networkId: String(networkId),
    channelId: String(channel),
    spaceIds: String(spaces),
  })

  // bot joins and sends welcome message
  const [slackClient] = await Promise.all([getSlackBotClient(settings)])
  await slackClient.join({
    channel: channel as string,
  })
  await slackClient.postMessage({
    channel: channel as string,
    text: 'Hello world from slack bot',
  })

  //print all connections ////////(remove this  for production )
  const prisma = new PrismaClient()
  const connections = await prisma.connection.findMany()
  logger.log('all connections', connections)
  // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId,
          type: InteractionType.Close,
        },
        {
          id: interactionId + randomUUID(),
          type: InteractionType.Reload,
          // slate: rawSlateToDto(slate),
          props: {
            dynamicBlockKeys: ['settings'],
          },
        },
      ],
    },
  }
}

export const getSearchSlackChannelCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: {
      actorId,
      interactionId,
      inputs: { channel, spaces },
    },
  } = webhook

  logger.log(webhook)
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId,
          type: InteractionType.Data,
          props: {
            items: [{ text: 'Bettermode Dev Portal', value: '1N25ZZyz5c' }],
          },
        },
      ],
    },
  }
}

export const getRemoveConnectionModalCallBackResponse = async (
  webhook: InteractionWebhook,
  connectionId: string,
): Promise<InteractionWebhookResponse> => {
  const {
    data: { interactionId },
  } = webhook

  const slate = getConnectionRemoveModalSlate(connectionId)
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId,
          type: InteractionType.OpenModal,
          props: {
            title: 'Remove Connection',
            size: 'md',
          },
          slate: rawSlateToDto(slate),
        },
      ],
    },
  }
}

export const getRemoveConnectionCallBackResponse = async (
  webhook: InteractionWebhook,
  connectionId: string,
): Promise<InteractionWebhookResponse> => {
  logger.log(webhook)
  const {
    data: { interactionId },
  } = webhook

  const prisma = new PrismaClient()
  const deletedConnection = await prisma.connection.delete({
    where: { id: connectionId },
  })

  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId,
          type: InteractionType.Close,
        },
        {
          id: interactionId + randomUUID(),
          type: InteractionType.Reload,
          // slate: rawSlateToDto(slate),
          props: {
            dynamicBlockKeys: ['settings'],
          },
        },
      ],
    },
  }
}

export const getCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getCallbackResponse called', { webhook })
  const {
    data: { callbackId },
  } = webhook

  //call back for opening the removeConnection modal
  if (callbackId.startsWith(SettingsBlockCallback.OpenConnectionRemoveModal)) {
    const connectionId = callbackId.replace(
      SettingsBlockCallback.OpenConnectionRemoveModal,
      '',
    )
    return getRemoveConnectionModalCallBackResponse(webhook, connectionId)
  }
  //call back for the remove connection button
  if (callbackId.startsWith(SettingsBlockCallback.RemoveConnection)) {
    const connectionId = callbackId.replace(SettingsBlockCallback.RemoveConnection, '')
    return getRemoveConnectionCallBackResponse(webhook, connectionId)
  }
  //call back for upsert connection
  if (callbackId.startsWith(SettingsBlockCallback.UpsertConnection)) {
    const connectionId = callbackId.replace(SettingsBlockCallback.UpsertConnection, '')
    if (connectionId.length > 0) {
      logger.log('A connection is being edditted')
      return getUpsertConnectionCallbackResponse(webhook, connectionId)
    }
    return getUpsertConnectionCallbackResponse(webhook)
  }
  //callback for open connection modal
  if (callbackId.startsWith(SettingsBlockCallback.OpenConnectionModal)) {
    const connectionId = callbackId.replace(SettingsBlockCallback.OpenConnectionModal, '')
    if (connectionId.length > 0) {
      return getOpenConnectionModalCallbackResponse(webhook, connectionId)
    }
    return getOpenConnectionModalCallbackResponse(webhook)
  }

  switch (callbackId) {
    case SettingsBlockCallback.AuthRedirect:
      return getAuthRedirectCallbackResponse(webhook)
    case SettingsBlockCallback.AuthRevoke:
      return getAuthRevokeCallbackResponse(webhook)
    case SettingsBlockCallback.SearchSlackChannel:
      return getSearchSlackChannelCallbackResponse(webhook)
    // case SettingsBlockCallback.OpenConnectionModal:
    //   return getOpenConnectionModalCallbackResponse(webhook)
    // case SettingsBlockCallback.UpsertConnection:
    //   return getUpsertConnectionCallbackResponse(webhook)

    default:
      return getInteractionNotSupportedError('callbackId', callbackId)
  }
}
