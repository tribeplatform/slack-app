import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

import { getAuthSettingsBlocks } from './auth.slate'

export const getNotConnectedSettingsSlate = (): RawSlateDto => {
  return {
    rootBlock: 'root',
    blocks: [
      {
        id: 'root',
        name: 'Container',
        props: { spacing: 'md' },
        children: ['auth'],
      },
      ...getAuthSettingsBlocks({
        id: 'root',
        action: 'Connect',
        actionCallbackId: SettingsBlockCallback.AuthRedirect,
        actionVariant: 'primary',
        description:
          `You need to authenticate Hubspot to activate this integration.` +
          ` Please take a look at documentation (you can find it in the right side bar) if you need more information.`,
      }),
    ],
  }
}
