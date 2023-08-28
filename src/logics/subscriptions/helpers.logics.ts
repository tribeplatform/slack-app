import { sendSlackMessage } from '@/services'
import { getNetworkClient } from '@clients'
import { UpdateMessagePayload } from '@interfaces'
import { NetworkSettings, PrismaClient } from '@prisma/client'
import { globalLogger, isDeleted } from '@utils'

const logger = globalLogger.setContext('MemberSubscriptionHelpers')

export const handleCreateEvent = async (options: {
  settings: NetworkSettings
  verb: string
  object?: object
  postId?: string
  spaceId?: string
  actorId?: string
}): Promise<void> => {
  const { settings, verb, object, postId, spaceId, actorId } = options
  const { networkId, memberId } = settings
  var skip: boolean = false //to check for deleted members

  //init clients
  const prisma = new PrismaClient()
  const connections = await prisma.connection.findMany({ where: { networkId } })
  const gqlClient = await getNetworkClient(networkId)

  //query thee 'network'
  const network = await gqlClient.query({
    name: 'network',
    args: 'basic',
  })
  //define payload
  const payload: UpdateMessagePayload = {
    event: verb,
    context: true,
    network,
  }

  const arr: string[] = [
    'space_membership.created',
    'space_membership.deleted',
    'space_join_request.created',
    'space_join_request.accepted',
    'member_invitation.created',
    'member.verified',
  ]
  if (arr.includes(verb)) {
    payload.context = false
  }

  //fill up payload attr
  if (spaceId) {
    const space = await gqlClient.query({
      //query the space
      name: 'space',
      args: { variables: { id: spaceId }, fields: 'basic' },
    })
    payload.space = space
  }
  if (actorId) {
    const actor = await await gqlClient.query({
      //query the member
      name: 'member',
      args: { variables: { id: actorId }, fields: 'basic' },
    })
    payload.actor = actor
  }
  if (postId) {
    const post = await gqlClient.query({
      //query the post
      name: 'post',
      args: { variables: { id: postId }, fields: 'basic' },
    })
    payload.post = post
  }

  if (verb != 'member_invitation.created') {
    if (memberId) {
      const member = await gqlClient.query({
        name: 'member',
        args: { variables: { id: memberId }, fields: 'basic' },
      })
      payload.member = member
      if (isDeleted(member)) skip = true
    }
    // }else{
    //   payload.member{
    //     id: object.id
    //     email: object.invitee
    //   }
    // }
    for (const connection of connections) {
      await sendSlackMessage(connection.channelId, payload, settings)
    }
  }
}
