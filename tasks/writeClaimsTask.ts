import { flatten, range } from 'lodash'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BigNumber } from 'ethers'
import { getBalancesFromMap, optimizeForGasRefund, sumBalances, writeClaims } from '../util/balance'
import { expectBalances, expectTotalAmount, importExpectations } from '../util/expectation'
import { getRunnableContext, RunnableContext } from '../util/context'
import { RunnableTaskArguments } from '../util/task'
import { Filename, getFiles } from '../util/filesystem'
import { getShieldBalancesForBullAirdropFinal } from './util/parse'
import { Writable } from '../util/writable'
import { logDryRun } from '../util/dry'
import { BalanceBN } from '../models/BalanceBN'
import { AmountBN } from '../models/AmountBN'
import { airdropRate, airdropStageDuration, airdropStageShareDenominator, airdropStageShareNumerator, airdropStartTimestamp, getMultiplier } from '../test/support/BullToken.helpers'
import { Address } from '../models/Address'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { getERC20BalancesAtBlockTag } from './util/getERC20Data'
import { unwrapSmartContractBalances } from './util/unwrapSmartContractBalances'
import { getClaimsFromBalances } from './util/balance'
import { findClosestBlock } from '../data/allBlocks'
import { ensure } from '../util/ensure'
import { seconds } from '../util/time'

export async function writeClaimsTask(args: WriteClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getWriteClaimsContext(args, hre)
  const { nextFolder, prevFolder, retroFolder, blacklistFolder, expectations: expectationsPath, out, dry } = args
  const { ethers } = hre
  const { log } = context
  const claims = await getClaimsFromRequests(context)
  await expectClaims(claims, await importExpectations(expectationsPath))
  if (!dry) await writeClaims(claims, out)
  if (dry) logDryRun(log)
}

export async function getClaimsFromFiles(nextFolder: Filename, prevFolder: Filename, retroFolder: Filename, blacklistFolder: Filename, context: WriteClaimsContext) {
  const { log } = context
  log('Parsing balances')
  const nextFolderFiles = getFiles(nextFolder)
  const prevFolderFiles = getFiles(prevFolder)
  const retroFolderFiles = getFiles(retroFolder)
  const blacklistFolderFiles = getFiles(blacklistFolder)
  const multiply = getMultiplier(airdropStageShareNumerator, airdropStageShareDenominator, airdropRate)
  const balancesOfAllMap = await getShieldBalancesForBullAirdropFinal(nextFolderFiles, prevFolderFiles, retroFolderFiles, blacklistFolderFiles)
  const balancesOfAll = getBalancesFromMap(balancesOfAllMap)
  const balancesOfHumans = await unwrapSmartContractBalances(balancesOfAll, context)
  const claims = balancesOfHumans.map(b => ({ ...b, amount: multiply(b.amount) }))
  return optimizeForGasRefund(claims)
}

async function expectClaims(claims: BalanceBN[], expectations: WriteClaimsExpectationsMap) {
  const expectedBalances = getBalancesFromMap(expectations.balances)
  const expectedTotalSupply = expectations.totalAmount
  expectBalances(claims, expectedBalances)
  expectTotalAmount(claims, expectedTotalSupply)
}

// export async function parseShieldBalancesCSV(data: CSVData) {
//   return rewriteBalanceMap(shieldRewriteAddressMap, await parseBalancesCSV(data))
// }

export interface WriteClaimsExpectationsMap {
  balances: { [address: string]: BigNumber },
  totalAmount: AmountBN,
}

interface WriteClaimsTaskArguments extends RunnableTaskArguments, Writable {
  shieldContractAddress: Address
  bullContractAddress: Address
  nextFolder: string
  prevFolder: string
  retroFolder: string
  blacklistFolder: string
  expectations: string
}

export interface WriteClaimsContext extends WriteClaimsTaskArguments, RunnableContext {

}

export async function getWriteClaimsContext(args: WriteClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<WriteClaimsContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}

export async function getClaimsFromRequests(context: WriteClaimsContext) {
  const claimsFromBullToken = await getClaimsFromBullToken(context)
  const claimsFromShieldToken = await getClaimsFromShieldToken(context)
  const claims = sumBalances(Array.prototype.concat(claimsFromBullToken, claimsFromShieldToken))
  return optimizeForGasRefund(claims)
}

async function getClaimsFromBullToken(context: WriteClaimsContext) {
  const { bullContractAddress } = context
  return getERC20BalancesAtBlockTag('latest', bullContractAddress, context)
}

async function getClaimsFromShieldToken(context: WriteClaimsContext) {
  const { shieldContractAddress } = context
  const blockTags = await getDistributionBlockTags(context)
  const balancesByDate = await Promise.all(blockTags.map(tag => getERC20BalancesAtBlockTag(tag, shieldContractAddress, context)))
  const balances = sumBalances(flatten(balancesByDate))
  return getClaimsFromBalances(balances)
}

async function getDistributionBlockTags(context: WriteClaimsContext): Promise<BlockTag[]> {
  const dates = await getDistributionDates(context)
  const blocks = dates.map(date => ensure(findClosestBlock(date)))
  return blocks.map(b => b.number)
}

async function getDistributionDates(context: WriteClaimsContext): Promise<Date[]> {
  const indexes = range(0, 5)
  const timestamps = indexes.map(airdropStageIndex => airdropStartTimestamp + airdropStageDuration * airdropStageIndex)
  return timestamps.map(t => new Date(t * seconds))
}
