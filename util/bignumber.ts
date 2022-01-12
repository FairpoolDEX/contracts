import { BigNumber } from 'ethers'

export type BigNumberRange = { min: BigNumber; max: BigNumber }

export const zero = BigNumber.from(0)

export const one = BigNumber.from(1)

export const ten = BigNumber.from(10)

export function sumBigNumbers(nums: BigNumber[]) {
  return nums.reduce((acc, num) => acc.add(num), BigNumber.from(0))
}

export function neg(num: BigNumber) {
  return zero.sub(num)
}