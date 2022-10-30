import { BN, BNLike } from './index'
import { one, zero } from './constants'

// BN.prototype[inspect.custom] = function () {
//   return this.toString()
// }

export const bn = BN.from

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
