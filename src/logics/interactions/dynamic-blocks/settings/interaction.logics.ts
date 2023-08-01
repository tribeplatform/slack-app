import { ErrorCode, WebhookStatus, WebhookType } from '@enums'
import { InteractionWebhook, InteractionWebhookResponse } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { PermissionContext } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

import { getInteractionNotSupportedError } from '../../../error.logics'

import { getCallbackResponse } from './callback.logics'
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

  return getConnectedSettingsResponse({ interactionId, settings })
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
