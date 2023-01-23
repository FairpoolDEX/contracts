import { concat, difference } from 'lodash'

export function isEqualBy<T>(a: T, b: T, getter: (t: T) => unknown) {
  return getter(a) === getter(b)
}

export function isSubset<T>(set: T[], subset: T[]) {
  return difference(set, subset).length === 0
}

export function removeByIndex<T>(array: T[], index: number) {
  return concat(
    array.slice(0, index),
    array.slice(index + 1),
  )
}
