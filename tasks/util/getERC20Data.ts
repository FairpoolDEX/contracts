import { Address } from '../../models/Address'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Ethers } from '../../util/types'
import { BalanceBN, validateBalanceBN } from '../../models/BalanceBN'
import { getGenericToken } from './getToken'
import { getTransfers } from './getTransfers'
import { RunnableContext } from '../../util/context'
import { unwrapSmartContractBalances } from './unwrapSmartContractBalances'

export async function getERC20HolderAddressesAtBlockTag(blockTag: BlockTag, contractAddress: Address, ethers: Ethers): Promise<Address[]> {
  const token = await getGenericToken(contractAddress, ethers)
  const transfers = await getTransfers(token, 0, blockTag)
  return transfers.map(t => t.to)
}

export async function getERC20BalanceForAddressAtBlockTag(address: Address, blockTag: BlockTag, contractAddress: Address, ethers: Ethers): Promise<BalanceBN> {
  const token = await getGenericToken(contractAddress, ethers)
  const amount = await token.balanceOf(address, { blockTag })
  return validateBalanceBN({ address, amount })
}

export async function getERC20BalancesAtBlockTag(blockTag: BlockTag, contractAddress: Address, context: RunnableContext): Promise<BalanceBN[]> {
  const { ethers } = context
  const addresses = await getERC20HolderAddressesAtBlockTag(blockTag, contractAddress, ethers)
  const balances = await Promise.all(addresses.map(address => getERC20BalanceForAddressAtBlockTag(address, blockTag, contractAddress, ethers)))
  return unwrapSmartContractBalances(balances, context)
}
