import { BigNumber, BigNumberish } from 'ethers'
import { BigNumber as BigNumberFloat } from 'bignumber.js'

const ten = new BigNumberFloat(10)

export function toBackendAmount(amount: BigNumberFloat.Value, decimals: BigNumberFloat.Value): BigNumberFloat {
  // return BigNumber.from(amount * Math.pow(10, decimals))
  // return parseUnits(amount.toFixed(decimals), decimals)
  return ten.pow(decimals).multipliedBy(amount)
}

export function toBackendAmountBN(amount: BigNumberFloat.Value, decimals: BigNumberFloat.Value): BigNumber {
  return BigNumber.from(toBackendAmount(amount, decimals).toFixed())
}

export function toFrontendAmount(amount: BigNumberFloat.Value, decimals: BigNumberFloat.Value): BigNumberFloat {
  return new BigNumberFloat(amount).dividedBy(ten.pow(decimals))
}

export function toFrontendAmountBN(amount: BigNumberish, decimals: BigNumberFloat.Value): BigNumberFloat {
  return toFrontendAmount(amount.toString(), decimals)
}

export const toEthString = (amount: BigNumberish) => toFrontendAmountBN(amount, 18).toString()
