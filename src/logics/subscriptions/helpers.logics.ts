import { TribeClient } from '@tribeplatform/gql-client'
import { globalLogger } from '@utils'

const logger = globalLogger.setContext('MemberSubscriptionHelpers')
const getAllMemberSpaces = async (gqlClient: TribeClient, id: string) => {
  const spaces = []
  let hasNextPage = true
  let after = null
  while (hasNextPage) {
    const currentBatch = await gqlClient.query({
      name: 'memberSpaces',
      args: {
        variables: { memberId: id, limit: 100, after },
        fields: {
          nodes: {
            space: 'basic',
          },
          pageInfo: 'all',
        },
      },
    })
    after = currentBatch.pageInfo.endCursor
    currentBatch?.nodes?.forEach(spaceMember => spaces.push(spaceMember?.space))
    hasNextPage = currentBatch.pageInfo.hasNextPage
  }
  return spaces
}

// export const handleUpsertContact = async (options: {
//   settings: NetworkSettings
//   memberId: string
// }) => {
//   const { settings, memberId } = options
//   const {
//     networkId,
//     contactsSettings: { create, fieldCategory, fields },
//   } = settings
//   const hubsportClient = await getHubspotClient(settings)
//   const gqlClient = await getNetworkClient(networkId)
//   const member = await gqlClient.query({
//     name: 'member',
//     args: {
//       variables: {
//         id: memberId,
//       },
//       fields: {
//         fields: 'basic',
//         role: 'basic',
//         badges: {
//           badge: 'basic',
//         },
//       },
//     },
//   })
//   const properties: any = {}
//   fields
//     .filter(field => DEFAULT_FIELDS_KEYS.includes(field))
//     .forEach(
//       field => (properties[getFieldName(fieldCategory, field)] = get(member, field)),
//     )

//   if (fields.includes('spaces')) {
//     const spaces = await getAllMemberSpaces(gqlClient, member.id)
//     properties[getFieldName(fieldCategory, 'spaces')] = limitString(
//       spaces?.map(space => space.slug).join('\n'),
//       65500,
//     )
//   }
//   if (fields.includes('badges')) {
//     properties[getFieldName(fieldCategory, 'badges')] = limitString(
//       member?.badges?.map(badge => badge?.badge?.name).join('\n'),
//       65500,
//     )
//   }
//   logger.debug(`Updating ${member.id} with ${JSON.stringify(member.fields)}`)
//   const customFields = fields
//     .filter(field => field.startsWith('custom_'))
//     .map(field => {
//       const key = field.replace('custom_', '')
//       properties[getFieldName(fieldCategory, field)] = null
//       return key
//     })
//   if (member?.fields?.length > 0) {
//     member.fields.forEach(field => {
//       if (customFields.includes(field.key)) {
//         properties[getFieldName(fieldCategory, `Custom ${field.key}`)] = field.value
//       }
//     })
//   }
//   const contact = await hubsportClient.getContactByEmail(member.email)
//   if (contact) {
//     logger.log('updateContact', { contact })
//     await hubsportClient.updateContact(contact.id, properties)
//   } else if (create) {
//     logger.log('createContact', { contact })
//     properties.firstname = member.name.split(' ')[0]
//     properties.lastname = member.name.split(' ').slice(1).join(' ')
//     properties.email = member.email
//     await hubsportClient.createContact(properties)
//   }
// }

// export const handleCreateEvent = async (options: {
//   settings: NetworkSettings
//   memberId: string
//   member?: Member
//   object: any
//   title: string
//   summary: string
//   time: Date
// }) => {
//   const { settings, memberId, object, time, title, summary } = options
//   const { networkId } = settings
//   const slackClient = await getSlackBotClient(settings)
//   let { member } = options
//   if (!member || !member?.email) {
//     const gqlClient = await getNetworkClient(networkId)
//     //   member = await gqlClient.query({
//     //     name: 'member',
//     //     args: {
//     //       variables: {
//     //         id: memberId,
//     //       },
//     //       fields: {
//     //         fields: 'basic',
//     //         role: 'basic',
//     //         badges: {
//     //           badge: 'basic',
//     //         },
//     //       },
//     //     },
//     //   })
//     // }

//     const extraData = {
//       ID: object?.id,
//       Slug: object?.slug,
//       Name: object?.name,
//       Title: object?.title,
//       Status: object?.status,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Created At': object?.createdAt,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Updated At': object?.updatedAt,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Created By ID': object?.createdById,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Owner ID': object?.ownerId,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Is Reply': object?.isReply,
//       Count: object?.count,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Post ID': object?.postId,
//       Reaction: object?.reaction?.reaction,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Space ID': object?.spaceId,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Member ID': object?.memberId,
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       'Inviter ID': object?.inviterId,
//       Private: object?.private,
//       Hidden: object?.hidden,
//     }
//     const timestamp = moment(time).toDate()
//     logger.debug('createEvent', { memberId, title, summary, extraData, timestamp })
//     await slackClient.postMessage({
//       channel: channel as string,
//       text: 'Hello world from slack bot',
//     })
//     // await hubsportClient.createEvent(member.email, { timestamp, title, summary, extraData })
//   }

//   export const handleCreateMemberEvent = async (options: {
//     settings: NetworkSettings
//     title: string
//     summary?: string
//     webhook: SubscriptionWebhook<Member>
//   }) => {
//     const {
//       settings,
//       title,
//       summary = '',
//       webhook: {
//         data: { object: member, time },
//       },
//     } = options
//     await handleCreateEvent({
//       title,
//       summary,
//       settings,
//       memberId: member.id,
//       member,
//       time,
//       object: member,
//     })
//   }

//   export const handleCreatePostEventII = async (options: {
//     settings: NetworkSettings
//     title?: string
//     summary?: string
//     webhook: SubscriptionWebhook<Post>
//   }) => {
//     const {
//       settings,
//       title,
//       summary = '',
//       webhook: {
//         networkId,
//         data: { object, time, actor },
//       },
//     } = options
//     const gqlClient = await getNetworkClient(networkId)
//     const post = await gqlClient.query({
//       name: 'post',
//       args: { variables: { id: object.id }, fields: { repliedTo: 'basic' } },
//     })

//     logger.log(`This is  the Post ${post}`)
//     await handleCreateEvent({
//       title: title || `Added a ${post?.repliedToId ? 'reply' : 'post'}`,
//       summary:
//         summary ||
//         `${createHyperlink({
//           text: post?.repliedToId ? post?.repliedTo.title : post?.title,
//           url: post?.url,
//         })}${turndownString(`<br/>${post?.shortContent}`)}`,
//       settings,
//       memberId: actor?.id,
//       time,
//       object: post,
//     })
//   }

//   export const handleCreateSpaceMembershipEvent = async (options: {
//     settings: NetworkSettings
//     title: string
//     summary?: string
//     webhook?: SubscriptionWebhook<any>
//   }) => {
//     const {
//       settings,
//       title,
//       summary = '',
//       webhook: {
//         data: { object, time },
//       },
//     } = options
//     await handleCreateEvent({
//       title,
//       summary,
//       settings,
//       memberId: object?.memberId,
//       time,
//       object,
//     })
//   }
