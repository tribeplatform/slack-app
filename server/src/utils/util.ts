/**
 * @method isEmpty
 * @param {String | Number | Object} value
 * @returns {Boolean} true & false
 * @description this value is Empty Check
 */
export const isEmpty = (value: string | number | object): boolean => {
  if (value === null) {
    return true;
  } else if (typeof value !== 'number' && value === '') {
    return true;
  } else if (typeof value === 'undefined' || value === undefined) {
    return true;
  } else if (value !== null && typeof value === 'object' && !Object.keys(value).length) {
    return true;
  } else {
    return false;
  }
};

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
  array.length ? array.filter((value, index, self)  => self.indexOf(value) === index) : array

export const toMap = <T>(array: Array<T>, key: string): Map<string,T> => new Map<string, T>(array.map(item => [item[key], item]))

export const chunk = <T>(array: Array<T>, size: number): Array<Array<T>> => array.reduce((all,one,i) => {
   const ch = Math.floor(i/size); 
   all[ch] = [].concat((all[ch]||[]),one); 
   return all
}, [])