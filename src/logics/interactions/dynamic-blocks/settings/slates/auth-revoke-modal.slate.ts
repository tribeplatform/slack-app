import { InteractionWebhook } from '@interfaces'
import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'
import { SettingsBlockCallback } from '../constants'

export const getAuthRevokeModalSlate = (webhook: InteractionWebhook): RawSlateDto => {
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
          value:
            'All connections connected to this integration will be lost if access to this application is revoked!',
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
          text: 'I Understand',
          variant: 'danger',
          callbackId: SettingsBlockCallback.AuthRevoke,
        },
        children: [],
      },
    ],
  }
}
