import { z } from 'zod'
import { AmountBNSchema, validateAmountBN } from './AmountBN'
import { BigNumberish } from 'ethers'
import { getShare as getShareOriginal } from '../libs/bn/util'
import { scale } from '../test/support/all.helpers'

export const ShareSchema = z.object({
  numerator: AmountBNSchema,
  denominator: AmountBNSchema,
})

export type Share = z.infer<typeof ShareSchema>

export function validateShareSchema(percentage: Share) {
  return ShareSchema.parse(percentage)
}

export function share(numerator: BigNumberish, denominator: BigNumberish) {
  return validateShareSchema({
    numerator: validateAmountBN(numerator),
    denominator: validateAmountBN(denominator),
  })
}

export const percent = (numerator: BigNumberish) => share(numerator, 100)

export function getShare(value: BigNumberish, share: Share) {
  return getShareOriginal(value, share.numerator, share.denominator)
}

export function getScaledPercent(numerator: BigNumberish) {
  return getShareOriginal(scale, numerator, 100)
}
