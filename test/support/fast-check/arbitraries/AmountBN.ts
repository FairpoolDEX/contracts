import { amountNum } from './AmountNum'
import { BigNumber } from 'ethers'
import { bigUint } from 'fast-check'

const uint256Max = 2n ** 256n - 1n

export function amountBN(max?: number) {
  return amountNum(max).map(BigNumber.from)
}

export function uint256BN() {
  return bigUint(uint256Max).map(BigNumber.from)
}
