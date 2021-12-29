import { difference } from 'lodash'

export function isEqualBy<T>(a: T, b: T, getter: (t: T) => unknown) {
  return getter(a) === getter(b)
}

export function isSubset<T>(set: T[], subset: T[]) {
  return difference(set, subset).length === 0
}
