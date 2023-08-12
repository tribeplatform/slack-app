import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'
import { SettingsBlockCallback } from '../constants'

export const getConnectionRemoveModalSlate = (): RawSlateDto => {
  return {
    rootBlock: 'root',
    blocks: [
      {
        id: 'root',
        name: 'Container',
        props: { spacing: 'md' },
        children: ['leftContainer', 'rightContainer'],
      },
      {
        id: 'leftContainer',
        name: 'Container',
        props: {
          size: 'md',
          direction: 'horizontal',
          alignment: 'horizontal',
        },
        children: ['promptMessage'],
      },
      {
        id: 'promptMessage',
        name: 'Text',
        props: {
          size: 'md',
          align: 'leading',
          format: 'markdown',
          value: 'Are you certain to remove this connection now?',
        },
        children: [],
      },
      {
        id: 'rightContainer',
        name: 'Container',
        props: {
          size: 'md',
          alignemnt: 'horizontal-reverse',
        },
        children: ['RemoveButton'],
      },
      //   {
      //     id: 'cancelButton',
      //     name: 'Button',
      //     props: {
      //       size: 'lg',
      //       text: 'Cancel',
      //       variant: 'basic',
      //       callbackId: SettingsBlockCallback.
      //     },
      //     children: [],
      //   },
      {
        id: 'RemoveButton',
        name: 'Button',
        props: {
          size: 'lg',
          text: 'Remove',
          variant: 'danger',
          callbackId: SettingsBlockCallback.RemoveConnection,
        },
        children: [],
      },
    ],
  }
}
