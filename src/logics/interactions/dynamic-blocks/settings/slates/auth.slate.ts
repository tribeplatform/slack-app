import { RawBlockDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

export const getAuthSettingsBlocks = (options: {
  id: string
  description: string
  action: string
  actionVariant: 'outline' | 'primary' | 'danger'
  actionCallbackId: SettingsBlockCallback
  secondaryAction?: string
  secondaryActionCallbackId?: SettingsBlockCallback
}): RawBlockDto[] => {
  const {
    id,
    description,
    action,
    actionVariant,
    actionCallbackId,
    secondaryAction,
    secondaryActionCallbackId,
  } = options
  return [
    {
      id,
      name: 'Card',
      children: [`${id}.header`, `${id}.content`],
    },
    {
      id: `${id}.header`,
      name: 'Card.Header',
      props: { title: 'Your authorization' },
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
        direction: 'horizontal',
      },
      children: [`${id}.leftContainer`, `${id}.rightContainer`],
    },
    {
      id: `${id}.leftContainer`,
      name: 'Container',
      props: { alignment: { vertical: 'center' } },
      children: [`${id}.description`],
    },
    {
      id: `${id}.description`,
      name: 'Text',
      props: {
        value: description,
        format: 'markdown',
      },
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
      children: [`${id}.action`, ...(secondaryAction ? [`${id}.secondaryAction`] : [])],
    },
    {
      id: `${id}.action`,
      name: 'Button',
      props: { variant: actionVariant, callbackId: actionCallbackId, text: action },
    },
    ...(secondaryAction
      ? [
          {
            id: `${id}.secondaryAction`,
            name: 'Button',
            props: {
              variant: 'basic',
              callbackId: secondaryActionCallbackId,
              text: secondaryAction,
            },
          },
        ]
      : []),
  ]
}
