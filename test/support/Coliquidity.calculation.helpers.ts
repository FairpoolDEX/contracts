import { BigNumber, BigNumberish } from 'ethers'
import { max } from './all.helpers'
import { zero } from './test.helpers'

export function getFee(amountWithdrawn: BigNumberish, amountDeposited: BigNumberish, feeNumerator: BigNumberish, feeDenominator: BigNumberish) {
  const $amountWithdrawn = BigNumber.from(amountWithdrawn)
  const $amountDeposited = BigNumber.from(amountDeposited)
  return max(zero, $amountWithdrawn.sub($amountDeposited).mul(feeNumerator).div(feeDenominator))
}

export function subtractFee(amountWithdrawn: BigNumberish, amountDeposited: BigNumberish, feeNumerator: BigNumberish, feeDenominator: BigNumberish) {
  const $fee = getFee(amountWithdrawn, amountDeposited, feeNumerator, feeDenominator)
  return BigNumber.from(amountWithdrawn).sub($fee)
}
