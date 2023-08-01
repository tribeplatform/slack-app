// import { CommuNnity } from '@prisma/client'
import { NetworkSettings } from '@prisma/client'
import { RawBlockDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

export const getActivitySyncIntegrationBlocks = (options: {
  id: string
  settings: NetworkSettings
}): RawBlockDto[] => {
  const { id, settings } = options
  const { enabled } = settings?.eventsSettings || { enabled: false }
  return [
    {
      id,
      name: 'Card',
      children: [`${id}.header`, `${id}.content`],
    },
    {
      id: `${id}.header`,
      name: 'Card.Header',
      props: { title: 'Send activites' },
    },
    {
      id: `${id}.content`,
      name: 'Card.Content',
      children: [`${id}.description`, `${id}.divider`, `${id}.activate`],
    },
    {
      id: `${id}.description`,
      name: 'Text',
      props: {
        format: 'markdown',
        value: `Enhance your understanding of community engagement by sending activity data to Hubspot's platform. With this integration, you can easily access the activity timeline of each user within their associated contact in Hubspot.`,
      },
    },
    {
      id: `${id}.divider`,
      name: 'Divider',
      props: { padding: 'lg' },
    },
    {
      id: `${id}.activate`,
      name: 'Toggle',
      props: {
        name: 'enabled',
        label: 'Enable sending activities',
        checked: enabled,
        callbackId: SettingsBlockCallback.ActivateActivityIntegration,
      },
    },
  ]
}
