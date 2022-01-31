import { BalanceBN } from '../../models/BalanceBN'
import { RunnableContext } from '../../util/context'
import { addBalances, BalancesMap, getBalancesFromMap, sumAmountsOf } from '../../util/balance'
import { flatten } from 'lodash'
import { AddressType, Human } from '../../models/AddressType'
import { isContract } from '../../util/contract'
import { ensure } from '../../util/ensure'
import { findNetwork } from '../../data/allNetworks'
import { findContractInfo } from '../../data/allContractInfos'
import { NFTrade, TeamFinance, UniswapV2Pair, Unknown } from '../../models/ContractType'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { parMap } from '../../util/promise'
import { getCodeCached } from '../../util/ethers'
import { impl } from '../../util/todo'
import { Address } from '../../models/Address'
import { getERC20BalancesAtBlockTagPaginated } from './getERC20Data'
import { getTransfersPaginatedCached } from './getTransfers'
import { deployedAt } from '../../test/support/ColiToken.helpers'
import { getGenericToken } from './getToken'
import { AmountBN } from '../../models/AmountBN'
import { zero } from '../../util/bignumber'
import { expect } from '../../util/expect'

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
export async function unwrapSmartContractBalancesAtBlockTag(balances: BalanceBN[], blockTag: BlockTag, tokenAddress: Address, context: RunnableContext): Promise<BalanceBN[]> {
  const balancesPerContract = await parMap(balances, unwrapSmartContractBalanceAtBlockTag, blockTag, tokenAddress, context)
  return addBalances(flatten(balancesPerContract))
}

export async function unwrapSmartContractBalanceAtBlockTag(balance: BalanceBN, blockTag: BlockTag, tokenAddress: Address, context: RunnableContext): Promise<BalanceBN[]> {
  const { cacheKey, signer, networkName, ethers } = context
  const { address } = balance
  const type = await getAddressType(address, context)
  const balances = await unwrapSmartContractBalanceAtBlockTagByType(type, balance, signer.address, blockTag, tokenAddress, context)
  expect(balance.amount).to.be.closeTo(sumAmountsOf(balances), 10)
  return balances
}

async function unwrapSmartContractBalanceAtBlockTagByType(type: AddressType, balance: BalanceBN, deployerAddress: string, blockTag: string | number, tokenAddress: string, context: RunnableContext) {
  switch (type) {
    case Human:
      return [balance]
    case TeamFinance:
      return [{ ...balance, address: deployerAddress }]
    case UniswapV2Pair:
      return unwrapUniswapV2PairBalanceAtBlockTag(balance, blockTag, tokenAddress, context)
    case NFTrade:
      return unwrapNFTradeBalanceAtBlockTag(balance, blockTag, tokenAddress, context)
    case Unknown:
      return [{ ...balance, address: deployerAddress }]
    default:
      throw impl(`for ${type}`)
  }
}

async function unwrapUniswapV2PairBalanceAtBlockTag(balance: BalanceBN, blockTag: BlockTag, tokenAddress: Address, context: RunnableContext): Promise<BalanceBN[]> {
  const { ethers, cache } = context
  const { address: uniswapPairAddress, amount: uniswapPairAmount } = balance
  const liquidityProviderBalances = await getERC20BalancesAtBlockTagPaginated(blockTag, uniswapPairAddress, context)
  const liquidityProviderTotalSupply = sumAmountsOf(liquidityProviderBalances)
  return liquidityProviderBalances.map(lpb => ({
    address: lpb.address,
    amount: uniswapPairAmount.mul(lpb.amount).div(liquidityProviderTotalSupply),
  }))
}

export async function unwrapNFTradeBalanceAtBlockTag(balance: BalanceBN, blockTag: BlockTag, tokenAddress: Address, context: RunnableContext): Promise<BalanceBN[]> {
  const { ethers, cache } = context
  const token = await getGenericToken(tokenAddress, ethers)
  const transfers = await getTransfersPaginatedCached(token, deployedAt, blockTag, cache)
  const balanceMap = transfers.reduce<BalancesMap>((map, transfer) => {
    let amount: AmountBN
    switch (true) {
      case transfer.to === balance.address:
        amount = map[transfer.from] || zero
        map[transfer.from] = amount.add(transfer.amount)
        break
      case transfer.from === balance.address:
        amount = map[transfer.to] || zero
        map[transfer.to] = amount.sub(transfer.amount)
        break
    }
    return map
  }, {})
  return getBalancesFromMap(balanceMap)
}

async function getAddressType(address: string, context: RunnableContext): Promise<AddressType> {
  const { networkName, ethers, cache, log } = context
  const code = await getCodeCached(ethers, cache, address)
  if (isContract(code)) {
    const network = ensure(findNetwork({ name: networkName }))
    const contractInfo = findContractInfo({ vm: network.vm, code })
    // const contractInfo = ensure(findContractInfo({ vm: network.vm, code }), async () => {
    //   debug(__filename, getAddressType, 'codeNotFound', code)
    //   return new Error(`Cannot find contract info for network: ${networkName} and address ${address} (https://etherscan.io/address/${address}#code)`)
    // })
    return contractInfo ? contractInfo.type : Unknown
  } else {
    return Human
  }
}
