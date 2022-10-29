import { bn, tenPow18 } from '../../libs/bn/util'
import { toBackendAmountBN } from '../../util-local/bignumber.convert'

const scale = tenPow18

export const jump1Percent = bn(tenPow18.div(100))

/**
 * Suffixes:
 * * UI - what is displayed in the UI
 * * FP - what is stored in the backend
 * * SC - what is stored in the smart contract
 */

export const bidFP_bidSC = (bidFP: number) => toBackendAmountBN(bidFP, 18)

export const amountFP_amountSC = (amountFP: number) => toBackendAmountBN(amountFP, 18)

export const jumpFP_jumpSC = (jumpFP: number) => toBackendAmountBN(jumpFP, 18)
