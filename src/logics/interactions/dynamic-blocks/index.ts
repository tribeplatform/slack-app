import { InteractionWebhook, InteractionWebhookResponse } from '@interfaces'
import { globalLogger } from '@utils'

import { getInteractionNotSupportedError } from '../../error.logics'

import { DynamicBlock } from './constants'
import { getSettingsInteractionResponse } from './settings'

const logger = globalLogger.setContext(`DynamicBlock`)

export const getDynamicBlockInteractionResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getDynamicBlockResponse called', { webhook })

  const {
    data: { dynamicBlockKey },
  } = webhook

  switch (dynamicBlockKey) {
    case DynamicBlock.Settings:
      return getSettingsInteractionResponse(webhook)
    default:
      return getInteractionNotSupportedError('dynamicBlockKey', dynamicBlockKey)
  }
}
