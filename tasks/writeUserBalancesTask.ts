import { flatten, shuffle } from 'lodash'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BigNumber } from 'ethers'
import { getBalancesFromMap, writeBalances } from '../util/balance'
import { expectBalances, expectTotalAmount, importExpectations } from '../util/expectation'
import { impl } from '../util/todo'
import { rebrandDummyRunId } from '../util/run'
import { $zero } from '../data/allAddresses'
import { getRunnableContext, isTest, RunnableContext } from '../util/context'
import { RunnableTaskArguments } from '../util/task'
import { Filename, getFiles } from '../util/filesystem'
import { parseAllBalancesCSV } from './util/parse'
import { Writable } from '../util/writable'
import { logDryRun } from '../util/dry'
import { BalanceBN } from '../models/BalanceBN'
import { AmountBN } from '../models/AmountBN'
import { rateLimiter } from '../util/infura'
import { AddressType, Human, NFTrade, TeamFinance } from '../models/AddressType'
import { isContract } from '../util/contract'

export async function writeUserBalancesTask(args: WriteUserBalancesTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getGetUserBalancesContext(args, hre)
  const { nextFolder, prevFolder, retroFolder, blacklistFolder, expectations: expectationsPath, out, dry } = args
  const { ethers } = hre
  const { log } = context
  const expectations: WriteUserBalancesExpectationsMap = await importExpectations(expectationsPath)
  const balances = await getUserBalances(nextFolder, prevFolder, retroFolder, blacklistFolder, expectations, context)
  if (!dry) await writeBalances(balances, out)
  if (dry) logDryRun(log)
}

export async function getUserBalances(nextFolder: Filename, prevFolder: Filename, retroFolder: Filename, blacklistFolder: Filename, expectations: WriteUserBalancesExpectationsMap, context: WriteUserBalancesContext) {
  const { log } = context
  log('Reading balances')
  const nextFolderFiles = getFiles(nextFolder)
  const prevFolderFiles = getFiles(prevFolder)
  const retroFolderFiles = getFiles(retroFolder)
  const blacklistFolderFiles = getFiles(blacklistFolder)
  log('Parsing balances')
  const balancesMap = await parseAllBalancesCSV(nextFolderFiles, prevFolderFiles, retroFolderFiles, blacklistFolderFiles)
  const balances = optimizeForGasRefund(await unwrapSmartContractBalances(getBalancesFromMap(balancesMap), context))
  const expectedBalances = getBalancesFromMap(expectations.balances)
  const expectedTotalSupply = expectations.totalAmount
  expectBalances(balances, expectedBalances)
  expectTotalAmount(balances, expectedTotalSupply)
  return balances
}

// export async function parseShieldBalancesCSV(data: CSVData) {
//   return rewriteBalanceMap(shieldRewriteAddressMap, await parseBalancesCSV(data))
// }

export function optimizeForGasRefund(balances: BalanceBN[]): BalanceBN[] {
  return shuffle(balances)
}

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
async function unwrapSmartContractBalances(balances: BalanceBN[], context: RunnableContext): Promise<BalanceBN[]> {
  if (isTest(context)) return balances
  return flatten(await Promise.all(balances.map(async b => {
    await rateLimiter.removeTokens(1)
    return unwrapSmartContractBalance(b, context)
  })))
  // return balances.reduce((newBalances: BalanceBN[], balance: BalanceBN) => newBalances.concat(unwrapSmartContractBalance(context, balance)), [])
}

async function getAddressType(address: string, context: RunnableContext): Promise<AddressType> {
  const { networkName, ethers, log } = context
  const code = await ethers.provider.getCode(address)
  if (isContract(code)) {
    console.log('address', address)
    // const network = ensure(findNetwork({ name: networkName }))
    // const contractInfo = ensure(findContractInfo({ vm: network.vm, code }), async () => { return new Error(`Cannot find contract info for network: ${networkName} and address ${address}`) })
    // return contractInfo.type
    return Human
  } else {
    return Human
  }
}

async function unwrapSmartContractBalance(balance: BalanceBN, context: RunnableContext): Promise<BalanceBN[]> {
  const { runId, deployerAddress, networkName, ethers } = context
  const { address } = balance
  const type = await getAddressType(address, context)
  switch (type) {
    case Human:
      return [balance]
    case TeamFinance:
      return [{ ...balance, address: deployerAddress }]
    case NFTrade:
      return runId === rebrandDummyRunId ? [{ ...balance, address: $zero }] : [balance]
    default:
      throw impl()
  }
}

export interface WriteUserBalancesExpectationsMap {
  balances: { [address: string]: BigNumber },
  totalAmount: AmountBN,
}

interface WriteUserBalancesTaskArguments extends RunnableTaskArguments, Writable {
  nextFolder: string
  prevFolder: string
  retroFolder: string
  blacklistFolder: string
  expectations: string
}

export interface WriteUserBalancesContext extends WriteUserBalancesTaskArguments, RunnableContext {

}

export async function getGetUserBalancesContext(args: WriteUserBalancesTaskArguments, hre: HardhatRuntimeEnvironment): Promise<WriteUserBalancesContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}
