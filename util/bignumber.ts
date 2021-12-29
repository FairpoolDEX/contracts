import { BigNumber } from 'ethers'

export function sumBigNumbers(nums: BigNumber[]) {
  return nums.reduce((acc, num) => acc.add(num), BigNumber.from(0))
}
