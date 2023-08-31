import { Types } from '@tribeplatform/gql-client'
import slackify from 'slackify-html'

const POST_TITLE_LIMIT = 100
export const createHyperlink = ({ text, url }: { text: string; url: string }) =>
  `*<${url}|${escapeText(text)}>*`
// `[${text}](${url})`

export const createEntityHyperLink = (entity: Types.Member | Types.Space) =>
  createHyperlink({ text: entity.name, url: entity.url })
export const createPostTitleBlock = (post: Types.Post) =>
  createTextBlock(
    createHyperlink({
      text:
        post.title.length > POST_TITLE_LIMIT
          ? `${post.title.substring(0, POST_TITLE_LIMIT)}...`
          : post.title,
      url: post.url,
    }),
  )

export const createPostContentQuote = (post: Types.Post) =>
  createQuote(parseHtml(post.shortContent))
export const createQuote = (text: string) => `> ${text}`
export const parseHtml = (text: string) => slackify(text)

export const createEntityContext = ({
  title,
  entity,
  emoji,
  image,
}: {
  title: string
  entity: Types.Member | Types.Space
  image?: string
  emoji?: string
}) => {
  const result = []
  if (image) {
    result.push({
      type: 'image',
      image_url: image,
      alt_text: title + ' Image',
    })
  }
  result.push({
    type: 'mrkdwn',
    text: `${emoji ? `:${emoji}: ` : ''}${title}: ${createEntityHyperLink(entity)}`,
  })
  return result
}

export const createTextSection = (text: string, type: string = 'mrkdwn') => ({
  type: 'section',
  text: {
    type,
    text,
  },
})
export const createTextBlock = (text: string, type: string = 'mrkdwn') => ({
  blocks: [createTextSection(text, type)],
})
export const escapeText = (text: string): string =>
  text.replace('>', '&gt;').replace('<', '&lt;').replace('&', '&amp;')
