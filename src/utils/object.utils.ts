import { Member } from '@tribeplatform/gql-client/types'

const TurndownService = require('turndown')
/**
 * @method isEmpty
 * @param {String | Number | Object} value
 * @returns {Boolean} true & false
 * @description this value is Empty Check
 */
export const isEmpty = (value: string | number | object): boolean => {
  if (value === null) {
    return true
  } else if (typeof value !== 'number' && value === '') {
    return true
  } else if (typeof value === 'undefined' || value === undefined) {
    return true
  } else if (value !== null && typeof value === 'object' && !Object.keys(value).length) {
    return true
  } else {
    return false
  }
}

export const isDeleted = (member: Member): boolean => {
  return member.name === 'Deleted Member'
}

export const isRecentlyJoined = (member: Member): boolean => {
  return Math.abs(new Date().getTime() - new Date(member.createdAt).getTime()) < 50 * 1000
}

export const slugify = (text: string, filler = '_'): string =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, filler) // Replace spaces with -
    .replace(/[^\u0100-\uFFFF\w\-]/g, filler) // Remove all non-word chars ( fix for UTF-8 chars )
    .replace(/\-\-+/g, filler) // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '')

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export const limitString = (text: string, limit: number): string => {
  if (text?.length && text?.length > limit) {
    return `${text.substr(0, limit - 3)}...`
  } else {
    return text
  }
}

// export const createHyperlink = (content: string, url: string) => `[${content}](${url})`

export const turndownString = (text: string): string => {
  const turndownService = new TurndownService()
  return turndownService.turndown(text)
}
