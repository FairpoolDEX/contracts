import { bn, getShare as getShareOriginal } from '../../libs/bn/utils'
import { toBackendAmountBN } from '../../libs/utils/bignumber.convert'
import { BigNumber, BigNumberish } from 'ethers'

export const decimals = bn(6)

export const scale = bn(10).pow(decimals)

export const jump1Percent = scale.div(100)

/**
 * Suffixes:
 * * UI - what is displayed in the UI
 * * FP - what is stored in the backend
 * * SC - what is stored in the smart contract
 */

export const bidFP_bidSC = (bidFP: number) => toBackendAmountBN(bidFP, 18)

export const amountFP_amountSC = (amountFP: number) => toBackendAmountBN(amountFP, 18)

export const jumpFP_jumpSC = (jumpFP: number) => toBackendAmountBN(jumpFP, 18)

export function getScaledPercent(numerator: BigNumberish) {
  return getShareOriginal(scale, numerator, 100)
}

export function getQuoteAmountMin(speed: BigNumber, scale: BigNumber) {
  return speed.mul(scale)
}
