import { sendSlackMessage } from '@/services'
import { UpdateMessagePayload, WebhookEntities } from '@interfaces'
import { NetworkSettings, PrismaClient } from '@prisma/client'
import { globalLogger, isDeleted } from '@utils'

const logger = globalLogger.setContext('MemberSubscriptionHelpers')

export const handleCreateEvent = async (options: {
  settings: NetworkSettings
  entities: WebhookEntities
  verb: string
  message: string
  postId: string
}): Promise<void> => {
  const { settings, verb, entities, message, postId } = options
  const { networkId } = settings
  // const { post, space, actor, owner } = entities

  //init clients
  const prisma = new PrismaClient()
  var connections = await prisma.connection.findMany({
    where: { networkId },
  })
  //connections with matching space or the ones that have no spaceids==> whole community
  connections = connections.filter(
    connection =>
      connection.spaceIds.includes(entities?.space ? entities?.space.id : null) ||
      connection.spaceIds.length == 0,
  )

  const arr: string[] = [
    'space_membership.created',
    'space_membership.deleted',
    'space_join_request.created',
    'space_join_request.accepted',
    'member_invitation.created',
    'member.verified',
  ]

  //define payload
  const payload: UpdateMessagePayload = {
    event: verb,
    network: entities?.network ? entities?.network : null,
    post: entities?.post ? entities?.post : null,
    space: entities?.space ? entities?.space : null,
    actor: entities?.actor ? entities?.actor : null,
    member: verb != 'member_invitation.created' ? entities?.owner : null,
    context: arr.includes(verb) ? false : true,
  }

  // logger.log('payload', payload)

  const skip: boolean = isDeleted(payload.member) ? true : false

  if (!skip) {
    for (const connection of connections) {
      await sendSlackMessage(connection.channelId, message, payload, settings)
    }
  }
}
