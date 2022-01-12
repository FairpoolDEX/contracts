import { pick } from 'lodash'

export function toUid<T>(obj: T, ...keys: Array<keyof T>) {
  return JSON.stringify(pick(obj, ...keys))
}
