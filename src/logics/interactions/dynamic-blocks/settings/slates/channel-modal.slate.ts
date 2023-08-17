import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'

// import { CreateTicketCallback } from '../constants'
import { ChannelField } from '../constants'
// import { Chnn } from '../interfaces'

export const getChannelModalSlate = (
  id: string,
  // actionCallbackId: SettingsBlockCallback,
  fields: ChannelField[],
  options: {
    // callbackId?: SettingsBlockCallback
    callbackId?: string
    action: {
      enabled?: boolean
      text?: string
      variant?: 'primary' | 'secondary' | 'outline'
      autoDisabled?: boolean
    }
  },
): RawSlateDto => {
  const { action, callbackId } = options

  const toggleContainer = {
    id: 'toggleContainer',
    name: 'Container',
    props: {
      alignment: 'center',
      direction: 'vertical',
      spacing: 'lg',
    },
    children: ['postPublishedToggle'],
  }
  const postPublishedToggle = {
    id: 'postPublishedToggle',
    name: 'Toggle',
    props: {
      label: 'Post Published',
      size: 'lg',
      required: 'false',
      checked: 'false',
    },
    children: [],
  }

  return {
    rootBlock: id,
    blocks: [
      {
        id,
        name: 'Form',
        props: {
          callbackId: callbackId,
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
        children: [...fields.map(field => field.id), 'submit', 'toggleContainer'],
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
      // toggleContainer,
      // postPublishedToggle,
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
