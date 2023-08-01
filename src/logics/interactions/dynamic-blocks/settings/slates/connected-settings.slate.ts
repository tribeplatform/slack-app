import { NetworkSettings } from '@prisma/client'
import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

import { getActivitySyncIntegrationBlocks } from './activity-sync.slate'
import { getAuthSettingsBlocks } from './auth.slate'
import { getContactSyncIntegrationBlocks } from './contact-sync.slate'
import { getFederatedSearchIntegrationBlocks } from './federated-search-integration.slate'
import { getTicketIntegrationBlocks } from './ticket-integration.slate'

export const getConnectedSettingsSlate = (options: {
  settings: NetworkSettings
}): RawSlateDto => {
  const { settings } = options
  return {
    rootBlock: 'root',
    blocks: [
      {
        id: 'root',
        name: 'Container',
        props: { spacing: 'md' },
        children: [
          'contact-integration',
          'activity-integration',
          'ticket-integration',
          'federated-search-integration',
          'auth',
        ],
      },
      ...getContactSyncIntegrationBlocks({
        id: 'contact-integration',
        settings,
      }),
      ...getActivitySyncIntegrationBlocks({
        id: 'activity-integration',
        settings,
      }),
      ...getTicketIntegrationBlocks({
        id: 'ticket-integration',
        settings,
      }),
      ...getFederatedSearchIntegrationBlocks({
        id: 'federated-search-integration',
        settings,
      }),
      ...getAuthSettingsBlocks({
        id: 'auth',
        action: 'Revoke',
        actionCallbackId: SettingsBlockCallback.AuthRevoke,
        actionVariant: 'danger',
        description:
          'Your app is successfully connected to Hubspot. To disconnect the integration at any time, simply click on the provided button.',
      }),
    ],
  }
}
