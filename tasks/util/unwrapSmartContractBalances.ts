import { BalanceBN } from '../../models/BalanceBN'
import { isTest, RunnableContext } from '../../util/context'
import { sumBalances } from '../../util/balance'
import { flatten } from 'lodash'
import { AddressType, Human } from '../../models/AddressType'
import { findAddressInfo } from '../../data/allAddressInfos'
import { impl, todo } from '../../util/todo'
import { getCode } from '../../util/ethers'
import { isContract } from '../../util/contract'
import { ensure } from '../../util/ensure'
import { findNetwork } from '../../data/allNetworks'
import { findContractInfo } from '../../data/allContractInfos'
import { NFTrade, TeamFinance } from '../../models/ContractType'
import { $zero } from '../../data/allAddresses'

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
export async function unwrapSmartContractBalances(balances: BalanceBN[], context: RunnableContext): Promise<BalanceBN[]> {
  if (isTest(context)) return balances
  return sumBalances(flatten(await Promise.all(balances.map(async b => {
    return unwrapSmartContractBalance(b, context)
  }))))
  // return balances.reduce((newBalances: BalanceBN[], balance: BalanceBN) => newBalances.concat(unwrapSmartContractBalance(context, balance)), [])
}

export async function unwrapSmartContractBalance(balance: BalanceBN, context: RunnableContext): Promise<BalanceBN[]> {
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
  const { networkName, ethers, log } = context
  const addressInfo = findAddressInfo({ network: networkName, address })
  if (addressInfo) {
    return addressInfo.type
  } else {
    return todo(Human)
    const code = await getCode(ethers, address)
    if (isContract(code)) {
      const network = ensure(findNetwork({ name: networkName }))
      const contractInfo = ensure(findContractInfo({ vm: network.vm, code }), async () => { return new Error(`Cannot find contract info for network: ${networkName} and address ${address}`) })
      return contractInfo.type
    } else {
      return Human
    }
  }
}
