import { array, integer } from 'fast-check'
import { strict as assert } from 'assert'

export const getNumerators = (length: number, resolution = 5000) => {
  assert(resolution > 1)
  return array(
    integer({
      min: 1, // must be at least 1, so that the generated value is not zero
      max: resolution, // may be any number higher than 1, higher numbers will lead to more diversity between the generated values
    }),
    {
      minLength: length,
      maxLength: length,
    },
  )
}
