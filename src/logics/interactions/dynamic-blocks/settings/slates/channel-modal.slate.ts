import { RawSlateDto } from '@tribeplatform/slate-kit/dtos'
import { globalLogger } from '@utils'
import { ChannelField } from '../constants'
const logger = globalLogger.setContext('getChannelModalSlate.slates')
export const getChannelModalSlate = (
  id: string,
  fields: ChannelField[],
  options: {
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
  // logger.log(fields)

  const result = {
    rootBlock: 'form',
    blocks: [
      {
        id: 'form',
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
        children: [...fields.map(field => field.id), `${id}.toggleContainer`, 'submit'],
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

  // logger.log(result)
  return result
}
