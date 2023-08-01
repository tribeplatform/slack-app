import { randomUUID } from 'crypto'

import {
  ErrorCode,
  InteractionType,
  ToastStatus,
  WebhookStatus,
  WebhookType,
} from '@enums'
import { InteractionWebhook, InteractionWebhookResponse } from '@interfaces'
// import { MemberPostSettingsRepository } from '@repositories'
import { getHubspotClient, getNetworkClient } from '@clients'
import { Property } from '@hubspot/api-client/lib/codegen/crm/schemas'
import { NetworkSettingsRepository } from '@repositories'
import { PermissionContext, Slate } from '@tribeplatform/gql-client/types'
import { rawSlateToDto } from '@tribeplatform/slate-kit/utils'
import { globalLogger, turndownString } from '@utils'

import { getInteractionNotSupportedError } from '../../../error.logics'

import { CreateTicketCallback, HubspotTicketPropertyName } from './constants'
import { TicketField, TicketFieldType } from './interfaces'
import { getCreateTicketSlate } from './slates'

const logger = globalLogger.setContext(`CreateTicketShortcut`)
const REQUIRED_PROPERTIES = [
  HubspotTicketPropertyName.Subject,
  HubspotTicketPropertyName.Stage,
  HubspotTicketPropertyName.Pipeline,
]
export const getCreateTicketCallbackResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getCreateTicketCallbackResponse called', { webhook })

  const {
    networkId,
    data: { interactionId, inputs },
    entityId,
  } = webhook

  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const [hubspotClient] = await Promise.all([getHubspotClient(settings)])
  try {
    const ticket = await hubspotClient.createTicket({
      properties: inputs as { [key: string]: string },
      associations: null,
    })
    return {
      type: WebhookType.Interaction,
      status: WebhookStatus.Succeeded,
      data: {
        interactions: [
          {
            id: interactionId,
            type: InteractionType.Close,
          },
          {
            id: `successful-create-ticket-${entityId}`,
            type: InteractionType.OpenToast,
            props: {
              status: ToastStatus.Success,
              title: 'Ticket created successfully',
              description: `Jira ticket ${ticket.id} has been created.`,
              link: {
                href: `https://app.hubspot.com/contacts/${settings.hubId}/record/0-5/${ticket.id}`,
                text: 'Open Ticket',
                enableCopy: true,
              },
            },
          },
        ],
      },
    }
  } catch (err) {
    logger.error('getCreateTicketCallbackResponse error', { err })
    return {
      type: WebhookType.Interaction,
      status: WebhookStatus.Failed,
      errorCode: ErrorCode.ParameterValidationFailed,
      errorMessage: err?.body?.message,
    }
  }
}

export const getCreateTicketInteractionResponse = async (
  webhook: InteractionWebhook,
): Promise<InteractionWebhookResponse> => {
  logger.debug('getCreateTicketInteractionResponse called', { webhook })

  const {
    networkId,
    data: { interactionId, actorId, callbackId, inputs },
    context,
    entityId: postId,
  } = webhook

  if (context !== PermissionContext.POST) {
    return getInteractionNotSupportedError('context', context)
  }

  switch (callbackId) {
    case CreateTicketCallback.Create:
      return getCreateTicketCallbackResponse(webhook)
  }
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const [gqlClient, hubspotClient] = await Promise.all([
    getNetworkClient(networkId),
    getHubspotClient(settings),
  ])
  const [properties, pipelines, owners, post, member] = await Promise.all([
    hubspotClient.getObjectTypeProperties('tickets'),
    hubspotClient.getPipelines('tickets'),
    hubspotClient.getOwners(),
    gqlClient.query({
      name: 'post',
      args: {
        variables: { id: postId },
        fields: {
          owner: {
            member: 'basic',
          },
        },
      },
    }),
    gqlClient.query({
      name: 'member',
      args: {
        variables: { id: actorId },
        fields: 'basic',
      },
    }),
  ])
  const pipelineProperty = properties.find(
    property => property.name === HubspotTicketPropertyName.Pipeline,
  )
  let fields: TicketField[] = []
  const currentPipeline = (inputs?.formValues as any)?.hs_pipeline || pipelines[0]?.id

  const fieldsMapping = {
    select: TicketFieldType.Select,
    text: TicketFieldType.Input,
    textarea: TicketFieldType.Textarea,
  }
  const acceptedFieldTypes = Object.keys(fieldsMapping)
  const getPropertyType = (type: string): TicketFieldType =>
    fieldsMapping[type || 'text'] || TicketFieldType.Textarea
  const getPropertyOptions = (property: Property) => {
    switch (property.name) {
      case HubspotTicketPropertyName.Owner:
        return owners.map(owner => ({
          label: `${owner?.firstName} ${owner?.lastName}`,
          value: owner?.id,
        }))
      case HubspotTicketPropertyName.Stage:
        return pipelines[0]?.stages
          .sort((first, second) => first?.displayOrder - second?.displayOrder)
          .map(stage => ({
            label: stage?.label,
            value: stage?.id,
          }))
    }
    return property?.options
  }
  const owner = owners.find(owner => owner?.email === member?.email)

  const getDefaultValue = (property: Property): string => {
    if (inputs?.formValues[property.name]) return inputs.formValues[property.name]
    switch (property.name) {
      case HubspotTicketPropertyName.Owner:
        return owner?.id
      case HubspotTicketPropertyName.Stage:
        return pipelines[0]?.stages[0]?.id
      case HubspotTicketPropertyName.Subject:
        return post?.title?.substring(0, 100) as string
      case HubspotTicketPropertyName.Description:
        return `Post URL: ${post?.url}\n\n${
          post?.description || turndownString(`<br/>${post?.description}`)
        }`.substring(0, 1500)
    }
    return null
  }
  fields = properties
    .filter(
      property =>
        property.formField &&
        !property.hidden &&
        acceptedFieldTypes.includes(property.fieldType),
    )
    .filter(property => property.name !== HubspotTicketPropertyName.Pipeline)
    .map(
      (property): TicketField => ({
        id: property.name,
        type: getPropertyType(property.fieldType),
        label: property.label,
        options: getPropertyOptions(property)?.map(option => ({
          text: option.label,
          value: option.value,
        })),
        defaultValue: getDefaultValue(property),
        required: REQUIRED_PROPERTIES.includes(
          property.name as HubspotTicketPropertyName,
        ),
        // isSearchable: getPropertyOptions(property)?.length > 5,
      }),
    )
  fields.unshift({
    id: HubspotTicketPropertyName.Pipeline,
    type: TicketFieldType.Select,
    label: pipelineProperty.label,
    options: pipelines.map(pipeline => ({
      text: pipeline?.label,
      value: pipeline?.id,
    })),
    defaultValue: currentPipeline as string,
    callbackId: CreateTicketCallback.ChangePipeline,
    required: true,
  })
  if (callbackId === CreateTicketCallback.ChangePipeline) {
    return getCreateTicketRerenderInteractionResponse(interactionId, fields)
  }
  return getCreateTicketModalInteractionResponse(interactionId, fields)
}

const getCreateTicketModalInteractionResponse = (
  id: string,
  fields: TicketField[],
): InteractionWebhookResponse => ({
  type: WebhookType.Interaction,
  status: WebhookStatus.Succeeded,
  data: {
    interactions: [
      {
        id,
        type: InteractionType.OpenModal,
        props: {
          size: 'md',
          title: 'Create a Hubspot ticket',
        },
        slate: getCreateTicketCallbackSlate(fields),
      },
    ],
  },
})

const getCreateTicketCallbackSlate = (fields: TicketField[]): Slate =>
  rawSlateToDto(
    getCreateTicketSlate(
      randomUUID(),
      fields.filter(field => field),
      {
        action: {
          autoDisabled: false,
          text: 'Create',
          variant: 'primary',
          enabled: true,
        },
      },
    ),
  )
const getCreateTicketRerenderInteractionResponse = (
  id: string,
  fields: TicketField[],
): InteractionWebhookResponse => ({
  type: WebhookType.Interaction,
  status: WebhookStatus.Succeeded,
  data: {
    interactions: [
      {
        id,
        type: InteractionType.Show,
        slate: getCreateTicketCallbackSlate(fields),
      },
    ],
  },
})
