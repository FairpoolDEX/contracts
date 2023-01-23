import { Contract } from 'ethers'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Address } from '../../models/Address'
import { AmountBN, validateAmountBN } from '../../models/AmountBN'
import { BalanceBN, validateBalanceBN } from '../../models/BalanceBN'
import { getCacheKey } from '../../utils/cache'
import { Cache } from 'cache-manager'

export async function getERC20AmountAtBlockTag(token: Contract, blockTag: BlockTag, address: Address) {
  return token.balanceOf(address, { blockTag })
}

export async function getERC20AmountsAtBlockTag(token: Contract, blockTag: BlockTag, addresses: Address[]): Promise<AmountBN[]> {
  return Promise.all(addresses.map((address) => getERC20AmountAtBlockTag(token, blockTag, address)))
}

export async function getERC20AmountsAtBlockTagCached(cache: Cache, token: Contract, blockTag: BlockTag, addresses: Address[]): Promise<AmountBN[]> {
  const cacheKey = getCacheKey(getERC20AmountsAtBlockTagCached, token.address, blockTag, addresses)
  const amountsCached = await cache.wrap<AmountBN[]>(cacheKey, () => getERC20AmountsAtBlockTag(token, blockTag, addresses))
  return amountsCached.map(validateAmountBN)
}

export async function getERC20Balances(token: Contract, addresses: Address[]): Promise<BalanceBN[]> {
  return Promise.all(addresses.map(async (address) => await getERC20Balance(token, address)))
}

export async function getERC20Balance(token: Contract, address: Address) {
  return validateBalanceBN({
    address,
    amount: await token.balanceOf(address),
  })
}
