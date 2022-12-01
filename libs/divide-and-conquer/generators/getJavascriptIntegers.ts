import { GetValues, getValuesOfInductive, getValuesOfRange } from '../getValues'
import { concat, identity, isInteger, uniqBy } from 'lodash'
import { strict as assert } from 'assert'

// const JavascriptInteger: InductiveTypeInfo<number> & RangeTypeInfo<number> = {
//   isInductive: true,
//   isRange: true,
//   base: 0,
//   next: (value) => value + 1,
//   min: ,
//   max: Number.MAX_SAFE_INTEGER,
// }

/**
 * Should we include -next()?
 */
export const getJavascriptIntegers: GetValues<number> = (pivot) => {
  assert(isInteger(pivot), 'pivot must be an integer')
  const values = concat<number>(
    getValuesOfInductive(0, v => v + 1)(pivot),
    getValuesOfRange(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)(pivot)
  )
  return uniqBy(values, identity)
}
