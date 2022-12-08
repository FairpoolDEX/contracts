import { ERC20Enumerable } from '../../../typechain-types'
import { rangeBNS } from '../../../libs/bn/utils'
import { chunk, flatten } from 'lodash'
import { Address } from '../../../models/Address'
import { validateBalanceBN } from '../../../models/BalanceBN'
import { mapAsync } from 'zenbox-util/promise'

export type ERC20EnumerableReal = ERC20Enumerable

export async function getHolders(real: ERC20EnumerableReal) {
  const holdersLength = await real.holdersLength()
  const holdersIndexes = rangeBNS(holdersLength)
  const holdersIndexesChunked = chunk(holdersIndexes, 10)
  const holdersChunked = await mapAsync(holdersIndexesChunked, (indexes) => mapAsync(indexes, (index) => real.holders(index)))
  return flatten<Address>(holdersChunked)
}

export async function getBalancesFull(real: ERC20EnumerableReal) {
  const holders = await getHolders(real)
  return getBalances(real, holders)
}

export async function getBalances(real: ERC20EnumerableReal, addresses: Address[]) {
  return mapAsync(addresses, address => getBalance(real, address))
}

export async function getBalance(real: ERC20EnumerableReal, address: Address) {
  return validateBalanceBN({
    address,
    amount: await real.balanceOf(address),
  })
}
