// import { CommuNnity } from '@prisma/client'
import { NetworkSettings } from '@prisma/client'
import { RawBlockDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

export const getFederatedSearchIntegrationBlocks = (options: {
  id: string
  settings: NetworkSettings
}): RawBlockDto[] => {
  const { id, settings } = options
  const { enabled } = settings?.federatedSearchSettings || { enabled: false }
  return [
    {
      id,
      name: 'Card',
      children: [`${id}.header`, `${id}.content`],
    },
    {
      id: `${id}.header`,
      name: 'Card.Header',
      props: { title: 'Federated search' },
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
        value: `Enhance the search experience within your community by seamlessly integrating your Hubspot knowledge base content. Display your valuable knowledge base articles directly within your community's search results, providing users with quick access to relevant information and empowering them to find answers effortlessly.`,
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
        label: 'Enable federated search',
        checked: enabled,
        callbackId: SettingsBlockCallback.ActivateFederatedSearchIntegration,
      },
    },
  ]
}
