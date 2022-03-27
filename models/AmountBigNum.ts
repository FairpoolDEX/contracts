import { z } from 'zod'
import { BigNumber as BigNum } from 'bignumber.js'

export const AmountBigNumSchema = z.instanceof(BigNum)

export type AmountBigNum = z.infer<typeof AmountBigNumSchema>

export function parseAmountBigNum(amount: AmountBigNum): AmountBigNum {
  return AmountBigNumSchema.parse(amount)
}
