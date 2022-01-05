import { shuffle } from 'lodash'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BigNumber } from 'ethers'
import { expect } from '../util/expect'
import { getBalancesFromMap, sumBalances, writeBalances } from '../util/balance'
import { expectBalances, importExpectations } from '../util/expectation'
import { impl } from '../util/todo'
import { AddressTypeSchema } from '../models/AddressInfo'
import { getAddressType } from '../data/allAddressInfos'
import { rebrandDummyRunId } from '../util/run'
import { $zero } from '../data/allAddresses'
import { getRunnableContext, isTest, RunnableContext } from '../util/context'
import { RunnableTaskArguments } from '../util/task'
import { Filename, getFiles } from '../util/filesystem'
import { BigNumberRange } from '../util/bignumber'
import { parseAllBalancesCSV } from './util/parse'
import { Writable } from '../util/writable'
import { logDryRun } from '../util/dry'
import { BalanceBN } from '../models/BalanceBN'

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

function expectTotalSupply(balances: BalanceBN[], expectedTotalSupply: BigNumberRange) {
  const totalSupply = sumBalances(balances)
  expect(totalSupply.gt(expectedTotalSupply.min)).to.be.true
  expect(totalSupply.lt(expectedTotalSupply.max)).to.be.true
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
  const balances = optimizeForGasRefund(unwrapSmartContractBalances(context, getBalancesFromMap(balancesMap)))
  const expectedBalances = getBalancesFromMap(expectations.balances)
  const expectedTotalSupply = expectations.totalSupply
  expectBalances(balances, expectedBalances)
  expectTotalSupply(balances, expectedTotalSupply)
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
function unwrapSmartContractBalances(context: RunnableContext, balances: BalanceBN[]): BalanceBN[] {
  if (isTest(context)) return balances
  const newBalances: BalanceBN[] = []
  return balances.reduce((newBalances: BalanceBN[], balance: BalanceBN) => newBalances.concat(unwrapSmartContractBalance(context, balance)), newBalances)
}

function unwrapSmartContractBalance(context: RunnableContext, balance: BalanceBN): BalanceBN {
  const { runId, deployerAddress, networkName, ethers } = context
  const { address } = balance
  const type = getAddressType(networkName, address)
  switch (type) {
    case AddressTypeSchema.enum.Human:
      return balance
    case AddressTypeSchema.enum.TeamFinanceLiquidityLocker:
      return { ...balance, address: deployerAddress }
    case AddressTypeSchema.enum.NFTrade:
      return runId === rebrandDummyRunId ? { ...balance, address: $zero } : balance
    default:
      throw impl()
  }
}

export interface WriteUserBalancesExpectationsMap {
  balances: { [address: string]: BigNumber },
  totalSupply: { min: BigNumber, max: BigNumber },
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
