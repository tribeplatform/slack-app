import { Connection, NetworkSettings } from '@prisma/client'
import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

import { getAuthSettingsBlocks } from './auth.slate'
import { getConnectedChannelsSettingsBlocks } from './connected-channels.slate'

export const getConnectedSettingsSlate = (options: {
  settings: NetworkSettings
  connections: Connection[]
  channelNames: string[]
  spaceNames: string[]
}): RawSlateDto => {
  const { settings, connections, channelNames, spaceNames } = options
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
        action: connections.length < 3 ? 'New Connection' : null,
        actionCallbackId: SettingsBlockCallback.OpenConnectionModal,
        actionVariant: 'primary',
        connections,
        channelNames,
        spaceNames,
      }),
      ...getAuthSettingsBlocks({
        id: 'auth',
        action: 'Revoke',
        actionCallbackId: SettingsBlockCallback.OpenAuthRevokeModal,
        actionVariant: 'danger',
        description:
          'Your app is successfully connected to Slack. To disconnect the integration at any time, simply click on the provided button.',
      }),
    ],
  }
}
