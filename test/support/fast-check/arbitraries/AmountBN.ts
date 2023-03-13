import { amountNum } from './AmountNum'
import { BigNumber } from 'ethers'
import { bigUint } from 'fast-check'
import { uint256MaxN } from '../../../../libs/bn/constants'

export function amountBN(max?: number) {
  return amountNum(max).map(BigNumber.from)
}

export function uint256BN() {
  return bigUint(uint256MaxN).map(BigNumber.from)
}
