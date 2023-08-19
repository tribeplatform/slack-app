import { InteractionType, WebhookStatus, WebhookType } from '@enums'
import { InteractionWebhookResponse } from '@interfaces'
import { Connection, NetworkSettings } from '@prisma/client'
import { rawSlateToDto } from '@tribeplatform/slate-kit/utils'

import { getNotConnectedSettingsSlate } from './slates'
import { getConnectedSettingsSlate } from './slates/connected-settings.slate'

export const getConnectedSettingsResponse = async (options: {
  interactionId: string
  settings: NetworkSettings
  connections: Connection[]
  channelNames: string[]
  spaceNames: string[]
}): Promise<InteractionWebhookResponse> => {
  const { interactionId, settings, connections, channelNames, spaceNames } = options

  const slate = getConnectedSettingsSlate({
    settings,
    connections,
    channelNames,
    spaceNames,
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
}): Promise<InteractionWebhookResponse> => {
  const { interactionId } = options
  const slate = getNotConnectedSettingsSlate()
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
