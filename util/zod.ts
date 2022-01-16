import { RefinementCtx, ZodIssueCode, ZodSchema, ZodType } from 'zod'
import { isEqualBy } from './lodash'
import { ZodTypeDef } from 'zod/lib/types'
import { impl } from './todo'

export interface ZodFlatError {
  formErrors: string[];
  fieldErrors: {
    [k: string]: string[];
  };
}

export type GetUid<UidHolder> = (holder: UidHolder) => string

export type Validate<Obj> = (object: Obj) => Obj

export interface Model<Obj, UidHolder> {
  schema: ZodSchema<Obj>,
  validate: Validate<Obj>
  getUid: GetUid<Obj>
}

export interface Stat {
  uid: string
  count: number
}

export function getDuplicatesRefinement<Val>(name: string, getUid: GetUid<Val>) {
  return function (values: Val[], context: RefinementCtx) {
    const stats = getDuplicateStats(values, getUid)
    stats.map(err => context.addIssue({
      code: ZodIssueCode.custom,
      params: err,
      message: `Found ${name} duplicates: ${JSON.stringify(err)}`,
    }))
  }
}

export function getDuplicateStats<Val>(values: Val[], getUid: GetUid<Val>) {
  const stats = getUniqueCountStats(values, getUid)
  return stats.filter(stat => stat.count > 1)
}

export function getUniqueCountMap<Val>(values: Val[], getUid: GetUid<Val>) {
  return values.map(getUid).reduce<Record<string, number>>((acc, uid) => {
    acc[uid] = (acc[uid] || 0) + 1
    return acc
  }, {})
}

export function getUniqueCountStats<Val>(values: Val[], getUid: GetUid<Val>): Stat[] {
  const map = getUniqueCountMap(values, getUid)
  return Object.entries(map).map(entry => ({
    uid: entry[0],
    count: entry[1],
  }))
}

export function getInserter<Output, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(name: string, schema: ZodType<Output, Def, Input>, getUid: GetUid<Output>, array: Array<Output>) {
  return function (object: Input) {
    const $object = schema.parse(object)
    const duplicate = array.find(o => isEqualBy(o, $object, getUid))
    if (duplicate) throw new Error(`Duplicate ${name} found: ${getUid(duplicate)}`)
    array.push($object)
    return $object
  }
}

export function getCustomInserter() {
  throw impl()
}

export function getFinder<UidHolder, Output extends UidHolder>(getUid: GetUid<UidHolder>, array: Array<Output>) {
  return function (uidHolder: UidHolder) {
    const uid = getUid(uidHolder)
    return array.find(obj => uid === getUid(obj))
  }
}
