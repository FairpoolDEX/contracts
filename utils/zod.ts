import { RefinementCtx, ZodIssueCode, ZodSchema, ZodType } from 'zod'
import { isEqualBy } from './lodash'
import { ZodTypeDef } from 'zod/lib/types'
import { isEqual } from 'lodash'
import { byUid, Uid } from '../models/Uid'

export interface ZodFlatError {
  formErrors: string[];
  fieldErrors: {
    [k: string]: string[];
  };
}

export type GetUid<UidHolder> = (holder: UidHolder) => Uid

export type Validate<Obj> = (object: Obj) => Obj

export interface Model<Obj, UidHolder> {
  schema: ZodSchema<Obj>,
  validate: Validate<Obj>
  getUid: GetUid<Obj>
}

export interface Stat {
  uid: Uid
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

export function getUniqueCountStats<Val>(values: Val[], getUid: GetUid<Val>): Stat[] {
  const stats: Stat[] = []
  return values.reduce<Stat[]>((stats, value) => {
    const uid = getUid(value)
    const index = stats.findIndex(s => isEqual(s.uid, uid))
    if (~index) {
      stats[index].count++
    } else {
      stats.push({ uid, count: 1 })
    }
    return stats
  }, stats)
}

export const insert = (name: string) => <Output, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(schema: ZodType<Output, Def, Input>) => (getUid: GetUid<Output>) => (array: Array<Output>) => (object: Input) => {
  const $object = schema.parse(object)
  const duplicate = array.find(o => isEqualBy(o, $object, getUid))
  if (duplicate) throw new Error(`Duplicate ${name} found: ${getUid(duplicate)}`)
  array.push($object)
  return $object
}

export function getGenericInserter<Output, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(name: string, schema: ZodType<Output, Def, Input>, getUid: GetUid<Output>) {
  return insert(name)(schema)(getUid)
}

export function getInserter<Output, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(name: string, schema: ZodType<Output, Def, Input>, getUid: GetUid<Output>, array: Array<Output>) {
  return insert(name)(schema)(getUid)(array)
}

export function getFinder<UidHolder, Output extends UidHolder>(getUid: GetUid<UidHolder>, array: Array<Output>) {
  return function (uidHolder: UidHolder) {
    return array.find(byUid(getUid, uidHolder))
  }
}
