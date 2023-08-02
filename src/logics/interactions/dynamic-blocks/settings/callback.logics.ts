import { getNetworkClient, getSlackBotClient } from '@clients'
import { InteractionType, WebhookStatus, WebhookType } from '@enums'
import {
  InteractionWebhook,
  InteractionWebhookResponse,
  RedirectInteractionProps,
} from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { rawSlateToDto } from '@tribeplatform/slate-kit/utils'
import { BASIC_FIELDS_KEYS, BASIC_FIELDS_MAPPING, globalLogger } from '@utils'
import { difference } from 'lodash'

import {
  getInteractionNotSupportedError,
  getServiceUnavailableError,
} from '../../../error.logics'

import { ChannelFieldOption, ChannelFieldType, SettingsBlockCallback } from './constants'
import { getConnectedSettingsResponse, getDisconnectedSettingsResponse } from './helpers'
import { getChannelModalSlate } from './slates/channel-modal.slate'
import { getConnectedSettingsSlate } from './slates/connected-settings.slate'

import { getConnectSlackUrl } from '@/logics'

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

const getActivateContactIntegrationCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getAuthRedirectCallbackResponse called', { webhook })
  const {
    networkId,
    data: { interactionId, inputs },
  } = webhook
  const { fieldCategory, create } = inputs as {
    fieldCategory: string
    create: boolean
  }
  let settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const hubspotClient = await getHubspotClient(settings)
  let propertyGroup = await hubspotClient.getPropertyGroupByName(fieldCategory)
  if (!propertyGroup) {
    propertyGroup = await hubspotClient.createPropertyGroup(fieldCategory)
  }

  const gqlClient = await getNetworkClient(networkId)
  const network = await gqlClient.query({
    name: 'network',
    args: 'basic',
  })

  const fields = BASIC_FIELDS_KEYS
  const fieldsMapping = BASIC_FIELDS_MAPPING
  network?.memberFields?.fields?.forEach(field => {
    const key = `custom_${field.key}`
    fields.push(key)
    fieldsMapping[key] = field.name
  })

  const availableProperties = await hubspotClient.getProperties(fieldCategory, fields)
  const newFields = difference(
    fields,
    availableProperties.map(property =>
      property.name.replace(`${property.groupName}_`, ''),
    ),
  )
  await hubspotClient.createProperties(fieldCategory, newFields, fieldsMapping)
  settings = await NetworkSettingsRepository.update(networkId, {
    contactsSettings: {
      create,
      fieldCategory,
      fields,
    },
  })

  logger.log('getAuthRedirectCallbackResponse called', { settings })

  return getConnectedSettingsResponse({ interactionId, settings })
}

export const getActivateCaseIntegrationCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: {
      interactionId,
      inputs: { value },
    },
  } = webhook

  let settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  settings = await NetworkSettingsRepository.update(networkId, {
    ticketCreationSettings: {
      enabled: value as boolean,
    },
  })
  return getConnectedSettingsResponse({
    interactionId,
    settings,
  })
}

export const getActivateFederatedSearchIntegrationCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: {
      interactionId,
      inputs: { value },
    },
  } = webhook

  let settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  settings = await NetworkSettingsRepository.update(networkId, {
    federatedSearchSettings: {
      enabled: value as boolean,
    },
  })
  return getConnectedSettingsResponse({
    interactionId,
    settings,
  })
}

export const getActivateActivityIntegrationCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: {
      interactionId,
      inputs: { value },
    },
  } = webhook

  let settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  settings = await NetworkSettingsRepository.update(networkId, {
    eventsSettings: {
      enabled: value as boolean,
    },
  })
  return getConnectedSettingsResponse({
    interactionId,
    settings,
  })
}

export const getContactCreationToggleCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: {
      interactionId,
      inputs: { value },
    },
  } = webhook

  let settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  settings = await NetworkSettingsRepository.update(networkId, {
    contactsSettings: {
      ...settings.contactsSettings,
      create: value as boolean,
    },
  })
  return getConnectedSettingsResponse({
    interactionId,
    settings,
  })
}

export const getOpenChannelModalCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: { interactionId },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const [gqlClient, slackClient] = await Promise.all([
    getNetworkClient(settings.networkId),
    getSlackBotClient(settings),
  ])

  const [spaces, channels] = await Promise.all([
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

  const slate = getChannelModalSlate(
    interactionId,
    [
      {
        id: 'channel',
        type: ChannelFieldType.Select,
        label: 'Channel',
        options: channelOptions,
      },
      {
        id: 'spaces',
        type: ChannelFieldType.Select,
        label: 'Spaces',
        options: spacesOptions,
      },
    ],
    {
      callbackId: SettingsBlockCallback.UpsertChannel,
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
export const getUpsertChannelCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  const {
    networkId,
    data: {
      interactionId,
      inputs: { channel, spaces },
    },
  } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  logger.log('getUpsertChannelCallbackResponse called', { webhook })
  const [slackClient] = await Promise.all([getSlackBotClient(settings)])
  await slackClient.join({
    channel: channel as string,
  })
  await slackClient.postMessage({
    channel: channel as string,
    text: 'Hello world from slack bot',
  })
  const slate = getConnectedSettingsSlate({
    settings,
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
    case SettingsBlockCallback.ActivateContactIntegration:
      return getActivateContactIntegrationCallbackResponse(webhook)
    case SettingsBlockCallback.ActivateTicketIntegration:
      return getActivateCaseIntegrationCallbackResponse(webhook)
    case SettingsBlockCallback.ActivateActivityIntegration:
      return getActivateActivityIntegrationCallbackResponse(webhook)
    case SettingsBlockCallback.UpdateContactCreationIntegration:
      return getContactCreationToggleCallbackResponse(webhook)
    case SettingsBlockCallback.ActivateFederatedSearchIntegration:
      return getActivateFederatedSearchIntegrationCallbackResponse(webhook)
    case SettingsBlockCallback.OpenChannelModal:
      return getOpenChannelModalCallbackResponse(webhook)
    case SettingsBlockCallback.UpsertChannel:
      return getUpsertChannelCallbackResponse(webhook)
    default:
      return getInteractionNotSupportedError('callbackId', callbackId)
  }
}
