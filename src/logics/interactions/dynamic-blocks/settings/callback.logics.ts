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
import { getConnectedSettingsSlate } from './slates/connected-settings.slate'

import { getConnectSlackUrl } from '@/logics'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
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

  const slate = getChannelModalSlate(
    randomUUID(),
    [
      {
        id: 'channel',
        type: ChannelFieldType.Select,
        label: 'Channel',
        isSearchable: true,
        dataCallbackId: SettingsBlockCallback.SearchSlackChannel,
        options: channelOptions,
        appId,
      },
      {
        id: 'spaces',
        type: ChannelFieldType.Select,
        label: 'Spaces',
        options: spacesOptions,
        isSearchable: true,
        dataCallbackId: SettingsBlockCallback.SearchSlackChannel,
        appId,
        defaultValue: spacesOptions[0].value,
      },
    ],
    {
      callbackId: SettingsBlockCallback.UpsertConnection,
      action: {
        autoDisabled: false,
        text: 'Create',
        variant: 'primary',
        enabled: true,
      },
    },
  )

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
  //upsert the collected data into db
  await ConnectionRepository.create({
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
  // await new SlackService(webhook.accessToken).sendWelcomeMessage(options);
  //get all the connections from db and pass it to the slate
  const prisma = new PrismaClient()
  const connections = await prisma.connection.findMany()
  logger.log(connections)

  //display the connected settings slate
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
          type: InteractionType.Close,
        },
        {
          id: 'interactionId',
          type: InteractionType.Show,
          slate: rawSlateToDto(slate),
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
          id: 'data',
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
): Promise<InteractionWebhookResponse> => {
  const {
    data: { interactionId },
  } = webhook

  const slate = getConnectionRemoveModalSlate()
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
): Promise<InteractionWebhookResponse> => {
  logger.log(webhook)
  return null
}

export const getCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getCallbackResponse called', { webhook })
  const {
    data: { callbackId },
  } = webhook
  switch (callbackId) {
    case SettingsBlockCallback.AuthRedirect:
      return getAuthRedirectCallbackResponse(webhook)
    case SettingsBlockCallback.AuthRevoke:
      return getAuthRevokeCallbackResponse(webhook)
    case SettingsBlockCallback.OpenConnectionModal:
      return getOpenConnectionModalCallbackResponse(webhook)
    case SettingsBlockCallback.UpsertConnection:
      return getUpsertConnectionCallbackResponse(webhook)
    case SettingsBlockCallback.SearchSlackChannel:
      return getSearchSlackChannelCallbackResponse(webhook)
    case SettingsBlockCallback.OpenConnectionRemoveModal:
      return getRemoveConnectionModalCallBackResponse(webhook)
    case SettingsBlockCallback.RemoveConnection:
      return getRemoveConnectionCallBackResponse(webhook)
    default:
      return getInteractionNotSupportedError('callbackId', callbackId)
  }
}
