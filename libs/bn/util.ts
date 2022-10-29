import { BN, BNLike } from './index'

// BN.prototype[inspect.custom] = function () {
//   return this.toString()
// }

export const bn = BN.from

export const zero = BN.from(0)

export const one = BN.from(1)

export const ten = BN.from(10)

export const tenPow18 = ten.pow(18)

export const uint256Max = BN.from(2).pow(256).sub(1)

export function sumBN(nums: BN[]) {
  return nums.reduce((acc, num) => acc.add(num), BN.from(0))
}

export function neg(num: BN) {
  return zero.sub(num)
}

export function getShare(value: BNLike, numerator: BNLike, denominator: BNLike) {
  return bn(value).mul(numerator).div(denominator)
}

export function rangeBN(from: BNLike, to: BNLike, step: BNLike = one) {
  let fromBN = bn(from)
  const result: BN[] = []
  while (fromBN.lt(to)) {
    result.push(fromBN)
    fromBN = fromBN.add(step)
  }
  return result
}

export function rangeBNS(to: BNLike, step: BNLike = one) {
  return rangeBN(0, to, step)
}
