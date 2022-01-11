import { BalanceBN } from '../../models/BalanceBN'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator, getMultiplier } from '../../test/support/BullToken.helpers'
import { AmountBN } from '../../models/AmountBN'
import { BigNumber } from 'ethers'

export function multiplyBalances(balances: BalanceBN[], multiplier: (amount: AmountBN) => BigNumber) {
  return balances.map(b => ({ ...b, amount: multiplier(b.amount) }))
}

export function getClaimsFromBalances(balances: BalanceBN[]) {
  const multiplier = getMultiplier(airdropStageShareNumerator, airdropStageShareDenominator, airdropRate)
  return multiplyBalances(balances, multiplier)
}
