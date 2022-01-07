import { pick } from 'lodash'

export function toUidSimple<T>(obj: T, ...keys: Array<keyof T>) {
  return JSON.stringify(pick(obj, ...keys))
}
