import { RefinementCtx, ZodIssueCode, ZodType } from 'zod'
import { isEqualBy } from './lodash'
import { ZodTypeDef } from 'zod/lib/types'

export interface ZodFlatError {
  formErrors: string[];
  fieldErrors: {
    [k: string]: string[];
  };
}

export function getDuplicatesRefinement<Model>(name: string, getUid: (object: Model) => string) {
  return function (objects: Model[], context: RefinementCtx) {
    const uidCounts = objects.map(getUid).reduce((acc, uid) => {
      acc[uid] = (acc[uid] || 0) + 1
      return acc
    }, {} as { [key: string]: number })
    for (const uid of Object.keys(uidCounts)) {
      const count = uidCounts[uid]
      if (count > 1) {
        context.addIssue({
          code: ZodIssueCode.custom,
          params: { uid, count },
          message: `Found ${name} duplicates with uid "${uid}" (${count} objects)`,
        })
      }
    }
  }
}

export type GetUid<UidHolder> = (holder: UidHolder) => string

export type Inserter<Input, Output> = (object: Input) => Output

export function getInserter<Output, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(name: string, schema: ZodType<Output, Def, Input>, getUid: (object: Output) => string, array: Array<Output>): Inserter<Input, Output> {
  return function (object: Input) {
    const $object = schema.parse(object)
    const duplicate = array.find(o => isEqualBy(o, $object, getUid))
    if (duplicate) throw new Error(`Duplicate ${name} found: ${getUid(duplicate)}`)
    array.push($object)
    return $object
  }
}

export function getFinder<UidHolder, Output extends UidHolder>(getUid: GetUid<UidHolder>, array: Array<Output>) {
  return function (uidHolder: UidHolder) {
    const uid = getUid(uidHolder)
    return array.find(obj => getUid(obj) === uid)
  }
}
