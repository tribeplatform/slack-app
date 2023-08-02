import { RawBlockDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

export const getConnectedChannelsSettingsBlocks = (options: {
  id: string
  action: string
  actionVariant: 'outline' | 'primary' | 'danger'
  actionCallbackId: SettingsBlockCallback
}): RawBlockDto[] => {
  const { id, action, actionCallbackId, actionVariant } = options
  return [
    {
      id,
      name: 'Card',
      children: [`${id}.header`, `${id}.content`],
    },
    {
      id: `${id}.header`,
      name: 'Card.Header',
      props: { title: 'Connected channels' },
    },
    {
      id: `${id}.content`,
      name: 'Card.Content',
      children: [`${id}.container`],
    },
    {
      id: `${id}.container`,
      name: 'Container',
      props: {
        spacing: 'md',
        direction: 'horizontal-reverse',
      },
      children: [`${id}.rightContainer`],
    },
    {
      id: `${id}.rightContainer`,
      name: 'Container',
      props: {
        direction: 'horizontal-reverse',
        spacing: 'xs',
        alignment: { vertical: 'center' },
        shrink: false,
      },
      children: [`${id}.action`],
    },
    {
      id: `${id}.action`,
      name: 'Button',
      props: { variant: actionVariant, callbackId: actionCallbackId, text: action },
    },
  ]
}
