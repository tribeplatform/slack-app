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
import { getNetwork } from '@/utils/query.utils'
import { PrismaClient } from '@prisma/client'
import { randomBytes, randomUUID } from 'crypto'
import { getAuthRevokeModalSlate } from './slates/auth-revoke-modal.slate'
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
  const network = await getNetwork(networkId)
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

const getAuthRevokeModalresponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  const {
    data: { interactionId },
  } = webhook

  const slate = getAuthRevokeModalSlate(webhook)
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId,
          type: InteractionType.OpenModal,
          props: {
            title: 'Revoke Authenticaion',
            size: 'md',
          },
          slate: rawSlateToDto(slate),
        },
      ],
    },
  }
}

const getAuthRevokeCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  // logger.debug('getAuthRedirectCallbackResponse called', { webhook })
  logger.debug('handleUninstalledWebhook called', { webhook })
  const {
    // networkId,
    data: { interactionId },
  } = webhook
  var revokeInteractions: boolean

  try {
    const client = new PrismaClient()
    await client.connection.deleteMany()
    await client.networkSettings.deleteMany()
    revokeInteractions = true
  } catch (error) {
    logger.error(error)
    return getServiceUnavailableError(webhook)
  }
  return getDisconnectedSettingsResponse({ interactionId, revokeInteractions })
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
        },
        fields: {
          nodes: 'basic',
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

  if (connectionId) {
    const client = new PrismaClient()
    const connection = await client.connection.findUnique({ where: { id: connectionId } })
    var savedSpaces: string[] = connection.spaceIds
    var savedChannels: string = connection.channelId
    var events = connection.events
  }
  const eventTypes: string[] = [
    'post.published',
    'member.verified',
    'moderation.created',
    'moderation.accepted',
    'moderation.rejected',
    'space_membership.created',
    'space_membership.deleted',
    'space_join_request.created',
    'space_join_request.accepted',
    'member_invitation.created',
  ]

  const getLabelFromEventType = (eventType: string): string => {
    // mapping of event types to their corresponding labels
    const labelMapping: Record<string, string> = {
      'post.published': 'New Post',
      'member.verified': 'Create Member',
      'moderation.created': 'Send To Moderation',
      'moderation.accepted': 'Accept Moderation Item',
      'moderation.rejected': 'Reject Moderation Item',
      'space_membership.created': 'Add Member To Space',
      'space_membership.deleted': 'Remove Member From Space',
      'space_join_request.created': 'Request To Join Space',
      'space_join_request.accepted': 'Accept Space Join Request',
      'member_invitation.created': 'Invite Member',
    }

    return labelMapping[eventType] || eventType // Default to eventType if no mapping found
  }
  const eventFields = eventTypes.map(eventType => ({
    id: eventType,
    type: ChannelFieldType.Toggle,
    label: getLabelFromEventType(eventType),
    defaultValue: events?.includes(eventType) ?? false,
  }))

  const slate = getChannelModalSlate(
    randomUUID(),
    [
      {
        id: 'channel',
        type: ChannelFieldType.Select,
        required: true,
        label: 'Channel',
        options: channelOptions,
        isSearchable: true,
        dataCallbackId: SettingsBlockCallback.SearchSlackChannel,
        defaultValue:
          typeof savedChannels != 'undefined' && savedChannels ? savedChannels : null,
        // : channelOptions[0].value,
        appId,
      },
      {
        id: 'spaces',
        type: ChannelFieldType.Select,
        label: 'Spaces',
        options: spacesOptions,
        isSearchable: true,
        dataCallbackId: SettingsBlockCallback.SearchSlackChannel,
        defaultValue:
          typeof savedSpaces != 'undefined' && savedSpaces ? savedSpaces : null,
        // defaultValue: spacesOptions[0].value,
        // defaultValue: savedSpaces && savedSpaces.length > 0 ? savedSpaces : 'Community',
        appId,
      },
      ...eventFields,
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
    data: { actorId, interactionId, inputs },
  } = webhook
  const {
    channel,
    spaces,
    post,
    postPublished,
    member,
    moderation,
    space_membership,
    space_join_request,
    member_invitation,
  } = inputs
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')
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

  const events: string[] = []

  if ((post as any)?.published) events.push('post.published')
  if ((member as any).verified) events.push('member.verified')
  if ((moderation as any).created) events.push('moderation.created')
  if ((moderation as any).accepted) events.push('moderation.accepted')
  if ((moderation as any).rejected) events.push('moderation.rejected')
  if ((space_membership as any).created) events.push('space_membership.created')
  if ((space_membership as any).deleted) events.push('space_membership.deleted')
  if ((space_join_request as any).created) events.push('space_join_request.created')
  if ((space_join_request as any).accepted) events.push('space_join_request.accepted')
  if ((member_invitation as any).created) events.push('member_invitation.created')

  // const eventTypes: string[] = [
  //   'post.published',
  //   'member.verified',
  //   'moderation.created',
  //   'moderation.accepted',
  //   'moderation.rejected',
  //   'space_membership.created',
  //   'space_membership.deleted',
  //   'space_join_request.created',
  //   'space_join_request.accepted',
  //   'member_invitation.created',
  // ]
  await ConnectionRepository.upsert(connectionId, {
    memberId: String(actorId),
    networkId: String(networkId),
    channelId: String(channel),
    spaceIds: String(spaces),
    events,
  })
  const [slackClient] = await Promise.all([getSlackBotClient(settings)])
  await slackClient.join({
    channel: channel as string,
  })
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId + randomUUID(),
          type: InteractionType.Reload,
          props: {
            dynamicBlockKeys: ['settings'],
          },
        },
        {
          id: interactionId,
          type: InteractionType.Close,
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
    data: { actorId, interactionId },
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
        },
        fields: {
          nodes: 'basic',
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
  return {
    type: WebhookType.Interaction,
    status: WebhookStatus.Succeeded,
    data: {
      interactions: [
        {
          id: interactionId,
          type: InteractionType.Data,
          props: {
            // items: [{ text: 'Bettermode Dev Portal', value: '1N25ZZyz5c' }],
            items: channelOptions
              .map(channel => ({ text: channel.text, value: channel.value }))
              .filter(option => option?.text && option?.value),
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
  const {
    data: { interactionId },
  } = webhook

  const prisma = new PrismaClient()
  await prisma.connection.delete({
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
    case SettingsBlockCallback.OpenAuthRevokeModal:
      return getAuthRevokeModalresponse(webhook)
    case SettingsBlockCallback.SearchSlackChannel:
      return getSearchSlackChannelCallbackResponse(webhook)

    default:
      return getInteractionNotSupportedError('callbackId', callbackId)
  }
}
