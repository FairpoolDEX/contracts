import { BalancesMap } from './balance'
import { Address, normalizeAddress } from '../models/Address'

export type RewriteAddressMap = Array<[Address, Address]>

export function getRewriteAddressMap(raw: RewriteAddressMap): RewriteAddressMap {
  return raw.map(([from, to]) => [normalizeAddress(from), normalizeAddress(to)])
}

export function rewriteAddress(rewrites: RewriteAddressMap, address: Address) {
  for (const [from, to] of rewrites) {
    if (address === from) {
      return to
    }
  }
  return address
}

export function rewriteBalanceMap(rewrites: RewriteAddressMap, balances: BalancesMap) {
  for (const address in balances) {
    const $address = rewriteAddress(rewrites, address)
    if ($address !== address) {
      balances[$address] = balances[address]
      delete balances[address]
    }
  }
  return balances
}
