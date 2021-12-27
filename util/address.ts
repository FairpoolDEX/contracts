import { Address } from './types'
import { BalanceMap } from './balance'

export type RewriteAddressMap = Array<[Address, Address]>

export function getRewriteAddressMap(raw: RewriteAddressMap): RewriteAddressMap {
  return raw.map(([from, to]) => [from.toLowerCase(), to.toLowerCase()])
}

export function rewriteAddress(rewrites: RewriteAddressMap, address: Address) {
  for (const [from, to] of rewrites) {
    if (address === from) {
      return to
    }
  }
  return address
}

export function rewriteBalanceMap(rewrites: RewriteAddressMap, balances: BalanceMap) {
  for (const address in balances) {
    const $address = rewriteAddress(rewrites, address)
    if ($address !== address) {
      balances[$address] = balances[address]
      delete balances[address]
    }
  }
  return balances
}
