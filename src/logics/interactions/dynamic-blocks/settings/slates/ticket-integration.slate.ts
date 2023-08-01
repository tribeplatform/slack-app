// import { CommuNnity } from '@prisma/client'
import { NetworkSettings } from '@prisma/client'
import { RawBlockDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

export const getTicketIntegrationBlocks = (options: {
  id: string
  settings: NetworkSettings
}): RawBlockDto[] => {
  const { id, settings } = options
  const { enabled } = settings?.ticketCreationSettings || { enabled: false }
  return [
    {
      id,
      name: 'Card',
      children: [`${id}.header`, `${id}.content`],
    },
    {
      id: `${id}.header`,
      name: 'Card.Header',
      props: { title: 'Create tickets' },
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
        value:
          `This module adds a menu option on post pages, within the (...) icon that can only be seen by staff. ` +
          `By clicking on the icon, staff can conveniently create Hubspot tickets directly from within the community.`,
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
        label: 'Enable ticket creation',
        checked: enabled,
        callbackId: SettingsBlockCallback.ActivateTicketIntegration,
      },
    },
  ]
}
