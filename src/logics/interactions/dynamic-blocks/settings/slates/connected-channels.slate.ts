import { RawBlockDto } from '@tribeplatform/slate-kit/dtos'

import { Connection } from '@prisma/client'
import { SettingsBlockCallback } from '../constants'

export const getConnectedChannelsSettingsBlocks = (options: {
  id: string
  action: string
  actionVariant: 'outline' | 'primary' | 'danger'
  actionCallbackId: SettingsBlockCallback
  connections: Connection[]
}): RawBlockDto[] => {
  const { id, action, actionCallbackId, actionVariant, connections } = options
  const connectionArr = [
    { userName: 'ehsan', id: '0123' },
    { userName: 'shayan', id: '1234' },
  ]

  const blocks = [
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
        // spacing: 'md',
        size: 'md',
        direction: 'vertical',
      },
      children: [`${id}.upperContainer`, `${id}.lowerContainer`],
    },
    {
      id: `${id}.upperContainer`,
      name: 'Container',
      props: {
        // direction: 'vertical',
        size: 'md',
        alignment: { vertical: 'center' },
        shrink: false,
      },
      children: connections.map((connection, index) => `${id}.connection${index}`),
    },
    ...connections.map((connection, index) => ({
      id: `${id}.connection${index}`,
      name: 'Container',
      props: {
        direction: 'horizontal',
        size: 'md',
        alignment: { vertical: 'center' },
        shrink: false,
      },
      children: [
        `${id}.connectionLeftContainer${index}`,
        `${id}.connectionRightContainer${index}`,
      ],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.connectionLeftContainer${index}`,
      name: 'Container',
      props: {
        size: 'md',
        direction: 'vertical',
      },
      children: [`${id}.connectionText${index}`],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.connectionText${index}`,
      name: 'Text',
      props: {
        size: 'md',
        align: 'leading',
        value: `${connection.channelId}\n${connection.memberId}`,
      },
      children: [],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.connectionRightContainer${index}`,
      name: 'Container',
      props: {
        size: 'md',
        direction: 'horizontal',
        alignment: 'horizontal-reverse',
      },
      children: [`${id}.editButton${index}`, `${id}.removeButton${index}`],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.editButton${index}`,
      name: 'Button',
      props: {
        size: 'sm',
        rounded: 'true',
        callbackId: SettingsBlockCallback.OpenModal,
        text: 'edit',
        variant: 'secondary',
      },
      children: [],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.removeButton${index}`,
      name: 'Button',
      props: {
        size: 'sm',
        rounded: 'true',
        callbackId: SettingsBlockCallback.OpenConnectionRemoveModal,
        text: 'remove',
        variant: 'danger',
      },
      children: [],
    })),
    {
      id: `${id}.lowerContainer`,
      name: 'Container',
      props: {
        direction: 'horizontal-reverse',
        size: 'md',
        alignment: { vertical: 'center' },
        shrink: false,
      },
      children: [`${id}.action`],
    },
    {
      id: `${id}.action`,
      name: 'Button',
      props: {
        variant: actionVariant,
        callbackId: actionCallbackId,
        text: action,
        size: 'lg',
      },
      children: [],
    },
  ]

  return blocks
}
