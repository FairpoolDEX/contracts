import { Address } from '../Address'
import { BalanceBN } from '../BalanceBN'

export function getAddressRewriter(oldAddress: Address, newAddress: Address) {
  return (balance: BalanceBN) => {
    if (balance.address === oldAddress) {
      return { ...balance, address: newAddress }
    } else {
      return balance
    }
  }
}
