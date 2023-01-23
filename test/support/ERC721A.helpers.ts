import { Address, validateAddress } from '../../models/Address'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Ethers } from '../../utils-local/types'
import { Cache } from 'cache-manager'
import { ERC721TokenId } from '../../models/ERC721TokenId'
import { getCacheKey } from '../../utils/cache'
import { getERC721Token } from '../../tasks/util/getERC721Token'
import { chunk, countBy, flatten, range, toPairs } from 'lodash'
import { maxRequestsPerSecond } from '../../utils-local/getblock'
import { getERC721AToken } from '../../tasks/util/getERC721AToken'
import { balanceBN, validateBalancesBN } from '../../models/BalanceBN'
import { BigNumber } from 'ethers'
import { sequentialMap } from 'libs/utils/promise'
import { debug } from '../../libs/utils/debug'

export async function getERC721ABalances(blockTag: BlockTag, contractAddress: Address, ethers: Ethers, cache: Cache) {
  const owners = await getERC721AOwners(blockTag, contractAddress, ethers, cache)
  const balances = toPairs(countBy(owners)).map(([address, balanceNum]) => balanceBN(address, BigNumber.from(balanceNum)))
  return validateBalancesBN(balances)
}

export async function getERC721AOwners(blockTag: BlockTag, contractAddress: Address, ethers: Ethers, cache: Cache) {
  const token = await getERC721AToken(contractAddress, ethers)
  const totalSupply = await token.totalSupply({ blockTag })
  const tokenIds = range(0, totalSupply.toNumber())
  const tokenIdsPaginated = chunk(tokenIds, maxRequestsPerSecond / 2)
  const resultsArray = await sequentialMap(tokenIdsPaginated, tokenIdPage => getERC721AOwnersAtBlockTagCached(tokenIdPage, blockTag, contractAddress, ethers, cache))
  return flatten(resultsArray)
}

export async function getERC721AOwnerAtBlockTag(tokenId: ERC721TokenId, blockTag: BlockTag, contractAddress: Address, ethers: Ethers) {
  debug(__filename, getERC721AOwnerAtBlockTag, tokenId, blockTag, contractAddress)
  const token = await getERC721Token(contractAddress, ethers)
  const owner = await token.ownerOf(tokenId, { blockTag })
  return validateAddress(owner)
}

export async function getERC721AOwnerAtBlockTagCached(tokenId: ERC721TokenId, blockTag: BlockTag, contractAddress: Address, ethers: Ethers, cache: Cache) {
  const cacheKey = getCacheKey(getERC721AOwnerAtBlockTagCached, tokenId, blockTag, contractAddress)
  const ownerCached = await cache.wrap<Address>(cacheKey, () => getERC721AOwnerAtBlockTag(tokenId, blockTag, contractAddress, ethers))
  return validateAddress(ownerCached)
}

export async function getERC721AOwnersAtBlockTagCached(tokenIds: ERC721TokenId[], blockTag: BlockTag, contractAddress: Address, ethers: Ethers, cache: Cache) {
  return Promise.all(tokenIds.map(tokenId => getERC721AOwnerAtBlockTagCached(tokenId, blockTag, contractAddress, ethers, cache)))
}
