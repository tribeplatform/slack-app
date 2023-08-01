// import { CommuNnity } from '@prisma/client'
import { NetworkSettings } from '@prisma/client'
import { RawBlockDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback } from '../constants'

export const getContactSyncSetupIntegrationBlocks = (options: {
  id: string
  settings: NetworkSettings
}): RawBlockDto[] => {
  const { id, settings } = options
  const { fieldCategory, create } = settings?.contactsSettings || {
    fieldCategory: null,
    create: false,
  }
  const isEnabled = Boolean(fieldCategory)
  const blocks: RawBlockDto[] = [
    {
      id,
      name: 'Form',
      props: {
        callbackId: SettingsBlockCallback.ActivateContactIntegration,
        defaultValues: {
          fieldCategory,
          create,
        },
      },
      children: [`${id}.container`],
    },
    {
      id: `${id}.container`,
      name: 'Container',
      props: { spacing: 'md' },
      children: [`${id}.input`, `${id}.activate`, `${id}.footer`],
    },
    {
      id: `${id}.input`,
      name: 'Input',
      props: {
        name: 'fieldCategory',
        label: 'Field Category',
        required: true,
        disabled: Boolean(isEnabled),
      },
    },
    {
      id: `${id}.activate`,
      name: 'Toggle',
      props: {
        name: 'create',
        label: 'Enable contact creation',
        checked: create,
        callbackId: isEnabled
          ? SettingsBlockCallback.UpdateContactCreationIntegration
          : undefined,
      },
    },
    {
      id: `${id}.footer`,
      name: 'Container',
      props: { direction: 'horizontal-reverse' },
      children: [`${id}.submit`],
    },
  ]
  if (!isEnabled) {
    blocks.push(
      getSubmitButton({
        id: `${id}.submit`,
        type: 'submit',
        variant: 'primary',
        text: 'Enable',
        autoDisabled: !isEnabled,
      }),
    )
  }
  return blocks
}
const getSubmitButton = ({
  id,
  autoDisabled,
  type = 'submit',
  variant = 'primary',
  text = 'Submit',
}: {
  id: string
  autoDisabled?: boolean
  type?: string
  variant?: string
  text: string
}): RawBlockDto => ({
  id,
  name: 'Button',
  props: {
    type,
    variant,
    text,
    autoDisabled,
  },
})

export const getContactSyncIntegrationBlocks = (options: {
  id: string
  settings: NetworkSettings
}): RawBlockDto[] => {
  const { id, settings } = options
  return [
    {
      id,
      name: 'Card',
      props: null,
      children: [`${id}.header`, `${id}.content`],
    },
    {
      id: `${id}.header`,
      name: 'Card.Header',
      props: { title: 'Contact syncing' },
    },
    {
      id: `${id}.content`,
      name: 'Card.Content',
      children: [`${id}.description`, `${id}.divider`, `${id}.settings`],
    },
    {
      id: `${id}.description`,
      name: 'Text',
      props: {
        format: 'markdown',
        value: `Effortlessly sync and manage your member data by seamlessly integrating it with Hubspot. Gain deeper insights into member engagement, track their interactions, and unlock powerful marketing and communication capabilities.`,
      },
    },
    {
      id: `${id}.divider`,
      name: 'Divider',
      props: { padding: 'lg' },
    },
    ...getContactSyncSetupIntegrationBlocks({
      settings,
      id: `${id}.settings`,
    }),
  ]
}
