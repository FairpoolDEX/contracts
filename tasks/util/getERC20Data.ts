import { Address } from '../../models/Address'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Ethers } from '../../util/types'
import { BalanceBN, validateBalanceBN } from '../../models/BalanceBN'
import { getGenericToken } from './getToken'
import { getTransfers } from './getTransfers'
import { RunnableContext } from '../../util/context'
import { unwrapSmartContractBalances } from './unwrapSmartContractBalances'
import { debug } from '../../util/debug'
import { deployedAt } from '../../test/support/ShieldToken.helpers'
import { chunk, flatten } from 'lodash'
import { maxRequestsPerSecond } from '../../util/getblock'
import { seqMap } from '../../util/promise'

export async function getERC20HolderAddressesAtBlockTag(blockTag: BlockTag, contractAddress: Address, ethers: Ethers): Promise<Address[]> {
  debug(__filename, getERC20HolderAddressesAtBlockTag, blockTag, contractAddress)
  const token = await getGenericToken(contractAddress, ethers)
  const transfers = await getTransfers(token, deployedAt, blockTag)
  return transfers.map(t => t.to)
}

export async function getERC20BalanceForAddressAtBlockTag(address: Address, blockTag: BlockTag, contractAddress: Address, ethers: Ethers): Promise<BalanceBN> {
  debug(__filename, getERC20BalanceForAddressAtBlockTag, address, blockTag, contractAddress)
  const token = await getGenericToken(contractAddress, ethers)
  const amount = await token.balanceOf(address, { blockTag })
  return validateBalanceBN({ address, amount })
}

export async function getERC20BalancesAtBlockTag(blockTag: BlockTag, contractAddress: Address, context: RunnableContext): Promise<BalanceBN[]> {
  const { ethers } = context
  const addresses = await getERC20HolderAddressesAtBlockTag(blockTag, contractAddress, ethers)
  const balances = await getERC20BalancesForAddressesAtBlockTag(addresses, blockTag, contractAddress, ethers)
  return unwrapSmartContractBalances(balances, context)
}

export async function getERC20BalancesAtBlockTagPaginated(blockTag: BlockTag, contractAddress: Address, context: RunnableContext): Promise<BalanceBN[]> {
  const { ethers } = context
  const addresses = await getERC20HolderAddressesAtBlockTag(blockTag, contractAddress, ethers)
  const addressesPaginated = chunk(addresses, maxRequestsPerSecond)
  const balances = flatten(await seqMap(addressesPaginated, addressPage => getERC20BalancesForAddressesAtBlockTag(addressPage, blockTag, contractAddress, ethers)))
  return unwrapSmartContractBalances(balances, context)
}

async function getERC20BalancesForAddressesAtBlockTag(addresses: Address[], blockTag: BlockTag, contractAddress: string, ethers: Ethers) {
  return Promise.all(addresses.map(address => getERC20BalanceForAddressAtBlockTag(address, blockTag, contractAddress, ethers)))
}
