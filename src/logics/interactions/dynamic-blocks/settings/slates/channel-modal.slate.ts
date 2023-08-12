import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'

// import { CreateTicketCallback } from '../constants'
import { ChannelField, SettingsBlockCallback } from '../constants'
// import { Chnn } from '../interfaces'

export const getChannelModalSlate = (
  id: string,
  // actionCallbackId: SettingsBlockCallback,
  fields: ChannelField[],
  options: {
    callbackId?: SettingsBlockCallback
    action: {
      enabled?: boolean
      text?: string
      variant?: 'primary' | 'secondary' | 'outline'
      autoDisabled?: boolean
    }
  },
): RawSlateDto => {
  const { action, callbackId } = options
  return {
    rootBlock: id,
    blocks: [
      {
        id,
        name: 'Form',
        props: {
          callbackId:
            callbackId || SettingsBlockCallback.UpdateContactCreationIntegration,
          defaultValues: fields.reduce(
            (acc, field) => ({ ...acc, [field.id]: field.defaultValue }),
            {},
          ),
        },
        children: ['fields'],
      },
      {
        id: 'fields',
        name: 'Container',
        props: { spacing: 'sm' },
        children: [...fields.map(field => field.id), 'submit'],
      },
      ...fields.map(field => ({
        id: field.id,
        name: field.type,
        props: {
          label: `${field.label}${field?.required ? ' *' : ''}`,
          name: field.id,
          hidden: field.hidden,
          ...(field.type === 'Select' && {
            value: field.defaultValue,
            items: field.options,
            ...(field.dataCallbackId && {
              dataCallbackId: field.dataCallbackId,
              isSearchable: field.isSearchable,
              appId: field.appId,
            }),
          }),
          ...(field.type === 'Input' && {
            maxLength: field.maxLength,
          }),
          ...(field.type === 'Textarea' && {
            maxLength: field.maxLength,
          }),
          ...(field.disabled && {
            disabled: field.disabled,
          }),
        },
      })),
      ...(action?.enabled
        ? [
            {
              id: 'submit',
              name: 'Button',
              props: {
                variant: action.variant || 'primary',
                type: 'submit',
                autoDisabled: action?.autoDisabled,
              },
              children: ['submit-text'],
            },
            {
              id: 'submit-text',
              name: 'Text',
              props: {
                value: action.text || 'Submit',
              },
            },
          ]
        : []),
    ],
  }
}
