import { BigNumber, BigNumberish } from 'ethers'

// BigNumber.prototype[inspect.custom] = function () {
//   return this.toString()
// }

export type BigNumberRange = { min: BigNumber; max: BigNumber }

export const zero = BigNumber.from(0)

export const one = BigNumber.from(1)

export const ten = BigNumber.from(10)

export const tenPower18 = ten.pow(18)

export const bn = BigNumber.from

export function sumBigNumbers(nums: BigNumber[]) {
  return nums.reduce((acc, num) => acc.add(num), BigNumber.from(0))
}

export function neg(num: BigNumber) {
  return zero.sub(num)
}

export function getShare(value: BigNumberish, numerator: BigNumberish, denominator: BigNumberish) {
  return BigNumber.from(value).mul(numerator).div(denominator)
}
