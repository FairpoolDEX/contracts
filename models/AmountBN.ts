import { z } from 'zod'
import { BigNumber } from 'ethers'

export const AmountBNSchema = z.preprocess(value => BigNumber.from(value), z.instanceof(BigNumber))

export type AmountBN = z.infer<typeof AmountBNSchema>

export function validateAmountBN(amount: AmountBN) {
  return AmountBNSchema.parse(amount)
}

export type PriceBN = AmountBN
