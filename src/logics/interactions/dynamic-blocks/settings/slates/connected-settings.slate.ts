import { NetworkSettings } from '@prisma/client'
import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

import { getAuthSettingsBlocks } from './auth.slate'
import { getConnectedChannelsSettingsBlocks } from './connected-channels.slate'

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
        children: ['channels', 'auth'],
      },
      ...getConnectedChannelsSettingsBlocks({
        id: 'channels',
        action: 'Connect more channels',
        actionCallbackId: SettingsBlockCallback.OpenChannelModal,
        actionVariant: 'primary',
      }),
      ...getAuthSettingsBlocks({
        id: 'auth',
        action: 'Revoke',
        actionCallbackId: SettingsBlockCallback.AuthRevoke,
        actionVariant: 'danger',
        description:
          'Your app is successfully connected to Slack. To disconnect the integration at any time, simply click on the provided button.',
      }),
    ],
  }
}
