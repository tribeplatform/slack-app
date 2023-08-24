import { RawBlockDto } from '@tribeplatform/slate-kit/dtos'

import { SettingsBlockCallback, connectionInfo } from '../constants'

export const getConnectedChannelsSettingsBlocks = (options: {
  id: string
  action: string
  actionVariant: 'outline' | 'primary' | 'danger'
  actionCallbackId: SettingsBlockCallback
  connections: connectionInfo[]
}): RawBlockDto[] => {
  const { id, action, actionCallbackId, actionVariant, connections } = options
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
        alignment: { horizontal: 'stretch' }, //vertical: 'center', horizntal: 'right'
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
        size: 'xl',
        direction: 'vertical',
        spacing: 'xs',
      },
      children: [
        `${id}.memberName${index}`,
        `${id}.channelName${index}`,
        `${id}.spaceName${index}`,
      ],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.memberName${index}`,
      name: 'Text',
      props: {
        size: 'sm',
        align: 'leading',
        value: `Member: ${connection.memberName}`,
        // format: 'markdown',
      },
      children: [],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.channelName${index}`,
      name: 'Text',
      props: {
        size: 'sm',
        align: 'leading',
        value: `Channel: ${connection.channelName}`,
        // format: 'markdown',
      },
      children: [],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.spaceName${index}`,
      name: 'Text',
      props: {
        size: 'sm',
        align: 'leading',
        value: `Space: ${connection.spaceName}`,
      },
      children: [],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.connectionRightContainer${index}`,
      name: 'Container',
      props: {
        size: 'xl',
        direction: 'horizontal',
        alignment: { horizontal: 'center' },
      },
      children: [`${id}.editButton${index}`, `${id}.removeButton${index}`],
    })),
    ...connections.map((connection, index) => ({
      id: `${id}.editButton${index}`,
      name: 'Button',
      props: {
        size: 'sm',
        callbackId: SettingsBlockCallback.OpenConnectionModal + connection.id,
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
        callbackId: SettingsBlockCallback.OpenConnectionRemoveModal + connection.id,
        variant: 'danger',
      },
      children: [`${id}.remove-icon`],
    })),
    {
      id: `${id}.remove-icon`,
      name: 'Icon',
      props: {
        name: 'alert-triangle',
        size: 'md',
        iconType: 'solid',
        color: 'attention',
      },
    },
    ...(action
      ? [
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
              trailingIcon: 'alert-triangle',
            },
            children: [],
          },
        ]
      : [
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
            name: 'RichText',
            props: {
              content: 'You have reached the max number of connections!!!',
              align: 'trailing',
              textColor: 'card-with-padding',
              backgroundcolor: 'dark',
            },
            children: [],
          },
        ]),
  ]
  return blocks
}
