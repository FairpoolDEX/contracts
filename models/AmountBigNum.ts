import { z } from 'zod'
import { BigNumber as BigNum } from 'bignumber.js'

export const AmountBigNumSchema = z.preprocess(value => new BigNum(String(value)), z.instanceof(BigNum))

export type AmountBigNum = z.infer<typeof AmountBigNumSchema>

export function parseAmountBigNum(amount: AmountBigNum): AmountBigNum {
  return AmountBigNumSchema.parse(amount)
}
