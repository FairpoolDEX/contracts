import { z, ZodObject } from 'zod'
import { pick } from 'lodash'
import { GetUid } from '../../../util/zod'
import { ZodRawShape } from 'zod/lib/types'

export const UidSchema = z.string().min(1).regex(/^[\w\d-_.]+$/)

export type Uid = z.infer<typeof UidSchema>

// export function toUid<T>(obj: T, map: Record<keyof T, GetUid<T>>) {
//   return JSON.stringify()
// }

export function toUid<T>(obj: T, ...keys: Array<keyof T>) {
  return JSON.stringify(pick(obj, ...keys))
}

export function toUidFromSchema<T extends ZodRawShape>(obj: z.infer<ZodObject<T>>, schema: ZodObject<T>) {
  return JSON.stringify(pick(obj, ...Object.keys(schema.shape)))
}

// export function toUid<T>(array: Array<T>): string {
//   return JSON.stringify(array)
// }

export function fromUid<T>(uid: string): T {
  return JSON.parse(uid)
}

export function byUid<UidHolder, Obj extends UidHolder>(getUid: GetUid<UidHolder>, holder: UidHolder) {
  const uid = getUid(holder)
  return function ($obj: Obj) {
    return uid === getUid($obj)
  }
}

// export function getCompositeUid<O extends Record<string, unknown>>(object: O, map: Record<keyof O, GetUid<unknown>>) {
//   return JSON.stringify(Object.assign({}, object, { items: schedule.items.map(getScheduleItemUid) }))
// }
