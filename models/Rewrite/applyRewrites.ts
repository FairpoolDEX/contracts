import { balanceBN, BalanceBN } from '../BalanceBN'
import { Rewrite } from '../Rewrite'

export function applyRewrites(rewrites: Rewrite[], balances: BalanceBN[]) {
  return balances.map(balance => {
    const rewrite = rewrites.find(r => r.from === balance.address)
    if (rewrite) {
      return balanceBN(rewrite.to, balance.amount)
    } else {
      return balance
    }
  })
}
