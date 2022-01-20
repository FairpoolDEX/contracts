import { BalanceBN } from '../../models/BalanceBN'
import { RunnableContext } from '../../util/context'
import { addBalances } from '../../util/balance'
import { flatten } from 'lodash'
import { AddressType, Human } from '../../models/AddressType'
import { impl } from '../../util/todo'
import { isContract } from '../../util/contract'
import { ensure } from '../../util/ensure'
import { findNetwork } from '../../data/allNetworks'
import { findContractInfo } from '../../data/allContractInfos'
import { NFTrade, TeamFinance } from '../../models/ContractType'
import { $zero } from '../../data/allAddresses'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { allMap } from '../../util/promise'
import { getCodeCached } from '../../util/ethers'

/** NOTES
 * Some smart contracts are multisigs, so the user can, technically, move the tokens
 * But those smart contracts don't exist on another network
 * Allow manual claims?
 * Get contract owner -> Set claim for owner address?
 * Some smart contracts are "lockers"
 * Liquidity pools
 * NFTrade staking contract
 * Implement a function from locker smart contract address to locked user balances?
 */
export async function unwrapSmartContractBalancesAtBlockTag(balances: BalanceBN[], blockTag: BlockTag, context: RunnableContext): Promise<BalanceBN[]> {
  const balancesPerContract = await allMap(balances, unwrapSmartContractBalanceAtBlockTag, blockTag, context)
  return addBalances(flatten(balancesPerContract))
}

export async function unwrapSmartContractBalanceAtBlockTag(balance: BalanceBN, blockTag: BlockTag, context: RunnableContext): Promise<BalanceBN[]> {
  const { cacheKey, deployerAddress, networkName, ethers } = context
  const { address } = balance
  const type = await getAddressType(address, context)
  switch (type) {
    case Human:
      return [balance]
    case TeamFinance:
      return [{ ...balance, address: deployerAddress }]
    case NFTrade:
      return cacheKey.includes('dummy') ? [{ ...balance, address: $zero }] : [balance]
    default:
      throw impl()
  }
}

async function getAddressType(address: string, context: RunnableContext): Promise<AddressType> {
  const { networkName, ethers, cache, log } = context
  const code = await getCodeCached(ethers, cache, address)
  if (isContract(code)) {
    const network = ensure(findNetwork({ name: networkName }))
    const contractInfo = ensure(findContractInfo({ vm: network.vm, code }), async () => { return new Error(`Cannot find contract info for network: ${networkName} and address ${address}`) })
    return contractInfo.type
  } else {
    return Human
  }
}
