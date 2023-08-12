import * as cheerio from 'cheerio'

export const capitalize = (string: string): string => {
  if (typeof string === 'string') {
    if (!string) {
      return ''
    }
    return string[0].toUpperCase() + string.slice(1)
  }
  return string
}

export const truncate = (input: string, length): string => {
  if (!input) {
    return ''
  }
  return input.length > length ? `${input.substring(0, length - 1)}...` : input
}

export const uniq = <T>(array: Array<T>): Array<T> =>
  array.length
    ? array.filter((value, index, self) => self.indexOf(value) === index)
    : array

export const toMap = <T>(array: Array<T>, key: string): Map<string, T> =>
  new Map<string, T>(array.map(item => [item[key], item]))

export const chunk = <T>(array: Array<T>, size: number): Array<Array<T>> =>
  array.reduce((all, one, i) => {
    const ch = Math.floor(i / size)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

export const transformMentions = (html: string, baseUrl: string): string => {
  let $ = cheerio.load(html)
  $('a[data-type=mention]').each(function (i) {
    const dataId = $(this).attr('data-id')
    if (dataId) $(this).attr('href', baseUrl + dataId)
  })
  return $.html().toString()
}
