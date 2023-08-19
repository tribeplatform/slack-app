import { InteractionType, WebhookStatus, WebhookType } from '@enums'
import { Interaction, InteractionWebhookResponse } from '@interfaces'
import { Connection, NetworkSettings } from '@prisma/client'
import { rawSlateToDto } from '@tribeplatform/slate-kit/utils'

import { randomUUID } from 'crypto'
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
