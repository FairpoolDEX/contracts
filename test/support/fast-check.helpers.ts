import { bigUint, nat } from 'fast-check'
import { BigNumber } from 'ethers'

export function amountNum(max?: number) {
  return nat({ max })
}

export function amountBN(max?: number) {
  return amountNum(max).map(BigNumber.from)
}

const uint256Max = 2n ** 256n - 1n

export function uint256BN() {
  return bigUint(uint256Max).map(BigNumber.from)
}
