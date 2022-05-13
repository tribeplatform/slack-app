import { Types } from '@tribeplatform/gql-client';
import slackify from 'slackify-html'

const POST_TITLE_LIMIT = 100;
export const createHyperlink = ({ text, url }: { text: string; url: string }): string => `*<${url}|${text}>*`;
export const createEntityHyperLink = (entity: Types.Member | Types.Space) => createHyperlink({ text: entity.name, url: entity.url });
export const createPostTitleBlock = (post: Types.Post) =>
  createTextBlock(
    createHyperlink({
      text: post.title.length > POST_TITLE_LIMIT ? `${post.title.substring(0, POST_TITLE_LIMIT)}...` : post.title,
      url: post.url,
    }),
  );

export const createPostContentQuote = (post: Types.Post) => `> ${slackify(post.shortContent)}`;

export const createEntityContext = ({ title, entity, image }: { title: string; entity: Types.Member | Types.Space; image?: string }) => {
  const result = [];
  if (image) {
    result.push({
      type: 'image',
      image_url: image,
      alt_text: title + ' Image',
    });
  }
  result.push({
    type: 'mrkdwn',
    text: `${title}: ${createEntityHyperLink(entity)}`,
  });
  return result;
};

export const createTextSection = (text: string, type: string = 'mrkdwn') => ({
  type: 'section',
  text: {
    type,
    text,
  },
});
export const createTextBlock = (text: string, type: string = 'mrkdwn') => ({
  blocks: [createTextSection(text, type)],
});
