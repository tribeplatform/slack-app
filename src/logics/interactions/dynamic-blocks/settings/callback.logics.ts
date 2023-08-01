import { getHubspotClient, getNetworkClient } from '@clients'
import { InteractionType, WebhookStatus, WebhookType } from '@enums'
import {
  InteractionWebhook,
  InteractionWebhookResponse,
  RedirectInteractionProps,
} from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { BASIC_FIELDS_KEYS, BASIC_FIELDS_MAPPING, globalLogger } from '@utils'
import { difference } from 'lodash'

import {
  getInteractionNotSupportedError,
  getServiceUnavailableError,
} from '../../../error.logics'

import { SettingsBlockCallback } from './constants'
import { getConnectedSettingsResponse, getDisconnectedSettingsResponse } from './helpers'

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
    default:
      return getInteractionNotSupportedError('callbackId', callbackId)
  }
}
