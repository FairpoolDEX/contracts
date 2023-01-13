import { BN } from '../../libs/bn'
import { DefaultScale } from '../../libs/fairpool/constants'
import { getShare as getShareOriginal } from '../../libs/bn/utils'
import { BigNumberish } from 'ethers'

export function getScaledPercent(numerator: BigNumberish) {
  return getShareOriginal(DefaultScale, numerator, 100)
}

export function getQuoteAmountMin(speed: BN, scale: BN) {
  return speed.mul(scale)
}
