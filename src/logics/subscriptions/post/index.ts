import { getImage } from '@/utils/query.utils'
import { SubscriptionWebhook } from '@interfaces'
import { NetworkSettings } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { EventVerb } from '@tribeplatform/gql-client/global-types'
import { Emoji, Image, Network, Post } from '@tribeplatform/gql-client/types'
import { blockUtils, globalLogger } from '@utils'
import { handleCreateEvent } from '../helpers.logics'

const logger = globalLogger.setContext(`Handle Post Subscription`)

export const handlePostSubscription = async (
  webhook: SubscriptionWebhook<Post>,
): Promise<void> => {
  const {
    networkId,
    entities,
    data: {
      verb,
      name,
      target: { networkDomain },
      object: { spaceId, shortContent, id },
    },
  } = webhook
  const {
    network,
    targetMember,
    post,
    space: { imageId: spaceMediaId },
  } = entities
  const { id: targetMemberId, profilePictureId: memberMediaId } = targetMember
  var {
    data: {
      object,
      object: { url, title },
    },
  } = webhook

  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const sentences = []

  //we do not recieve post entity when its a 'reply'
  if (!post) {
    object.url = url + '/post/' + title.replace(' ', '-') + '-' + id
  } else {
    title = post.title
    object.url =
      url + '/post/' + title.replace(' ', '-') + '-' + post.id + '?highlight=' + id
  }

  // logger.log('url', url)
  switch (verb) {
    case EventVerb.PUBLISHED:
      // sentences.push(blockUtils.createHyperlink({ text: title, url }))
      sentences.push(
        `${blockUtils.createMemberEntityHyperLink(targetMember, {
          networkDomain,
          memberId: targetMemberId,
        })} added a ${post ? 'reply' : 'post'}` +
          '\n' +
          `${blockUtils.createPostTitle(object as Post)}`,
      )
      if (shortContent != null) {
        sentences.push(`${blockUtils.createPostContentQuote(object as Post)}`)
      }
      break

    default:
      break
  }

  const context: any[] = []
  if (memberMediaId) {
    const image = await getImage({ networkId, mediaId: memberMediaId })
    const { url: memberimageUrl } = image as Image
    const { text: memberEmojiText } = image as Emoji
    logger.log(image)
    context.push(
      blockUtils.createEntityContext({
        title: 'Member',
        emoji: memberEmojiText,
        image: memberimageUrl,
        entity: targetMember,
      }),
    )
  }
  if (spaceMediaId) {
    const spaceImage = await getImage({ networkId, mediaId: spaceMediaId })
    const { url: spaceimageUrl } = spaceImage as Image
    const { text: spaceEmojiText } = spaceImage as Emoji
    logger.log(spaceImage)
    context.push(
      blockUtils.createEntityContext({
        title: 'Space',
        emoji: spaceEmojiText,
        image: spaceimageUrl,
        entity: targetMember,
      }),
    )
  }

  // const image = (targetMember.profilePicture as Types.Image)?.url
  // const emoji = (targetMember.profilePicture as Types.Emoji)?.text
  // context.push(
  // blockUtils.createEntityContext({
  //     title: 'Member',
  //     emoji,
  //     image,
  //     entity: targetMember,
  //   }),
  // )

  await handleCreatePostEvent({
    settings,
    network,
    sentences,
    spaceId,
    // context,
    name,
  })
}

export const handleCreatePostEvent = async (options: {
  settings: NetworkSettings
  network: Network
  sentences: string[]
  spaceId?: string
  name: string
  context?: any[]
  // space: Space
}): Promise<void> => {
  logger.log('handleCreatePostEvent called')
  const { settings, network, sentences, spaceId, name, context } = options

  await handleCreateEvent({
    settings,
    sentences,
    context,
    spaceId,
    network,
    name,
  })
}
