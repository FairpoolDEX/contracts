import { BalanceBN } from '../BalanceBN'
import { Address } from '../Address'
import { AmountBN } from '../AmountBN'
import { ensure } from '../../util/ensure'

export function moveBalances(balances: BalanceBN[], from: Address, to: Address, amount: AmountBN): BalanceBN[] {
  // NOTE: This function mutates the data
  const fromBalance = ensure(balances.find(b => b.address === from))
  const toBalance = ensure(balances.find(b => b.address === to))
  fromBalance.amount = fromBalance.amount.sub(amount)
  toBalance.amount = toBalance.amount.add(amount)
  return balances
}
