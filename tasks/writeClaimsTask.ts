import { concat, flatten, range } from 'lodash'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { addBalances, getBalancesFromMap, optimizeForGasRefund, writeClaims } from '../util/balance'
import { Expected, importDefault } from '../util/expectation'
import { getRunnableContext, RunnableContext } from '../util/context'
import { RunnableTaskArguments } from '../util/task'
import { Filename, getFiles } from '../util/filesystem'
import { getShieldBalancesForBullAirdropFinal } from './util/parse'
import { Writable } from '../util/writable'
import { logDryRun } from '../util/dry'
import { airdropRate, airdropStageDuration, airdropStageMaxCount, airdropStageShareDenominator, airdropStageShareNumerator, airdropStageSuccessCount, airdropStartTimestamp, getMultiplier, pausedAt } from '../test/support/BullToken.helpers'
import { getERC20BalancesAtBlockTagPaginated } from './util/getERC20Data'
import { unwrapSmartContractBalances } from './util/unwrapSmartContractBalances'
import { getClaimsFromBalances } from './util/balance'
import { findClosestBlock } from '../data/allBlocks'
import { ensure } from '../util/ensure'
import { isBullSellerBalance } from '../data/allAddresses'
import { findDeployment } from '../data/allDeployments'
import { seqMap } from '../util/promise'
import { ContextualValidator, validateWithContext } from '../util/validator'
import { BalanceBN } from '../models/BalanceBN'
import { BlockNumber } from '../models/BlockNumber'

export async function writeClaimsTask(args: WriteClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getWriteClaimsContext(args, hre)
  const { expectations: expectationsPath, out, dry } = args
  const { log } = context
  const validators = await importDefault(expectationsPath)
  const $claims = await getClaimsViaRequests(context)
  const claims = await validateWithContext($claims, validators, context)
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

export type WriteClaimsValidator = ContextualValidator<BalanceBN[], WriteClaimsContext>

interface WriteClaimsTaskArguments extends RunnableTaskArguments, Writable, Expected {
  // nextFolder: string
  // prevFolder: string
  // retroFolder: string
  // blacklistFolder: string
}

export interface WriteClaimsContext extends WriteClaimsTaskArguments, RunnableContext {

}

export async function getWriteClaimsContext(args: WriteClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<WriteClaimsContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}

export async function getClaimsViaRequests(context: WriteClaimsContext) {
  const claimsFromBullToken = await getClaimsFromBullToken(context)
  const claimsFromShieldToken = await getClaimsFromShieldToken(context)
  const claims = addBalances(concat(claimsFromBullToken, claimsFromShieldToken))
  return claims.filter(c => !isBullSellerBalance(c))
}

export async function getClaimsFromBullToken(context: WriteClaimsContext) {
  const deployment = ensure(findDeployment({ contract: 'BullToken', network: context.networkName }))
  return getERC20BalancesAtBlockTagPaginated(pausedAt + 1, deployment.address, context)
}

export async function getClaimsFromShieldToken(context: WriteClaimsContext) {
  const deployment = ensure(findDeployment({ contract: 'ShieldToken', network: context.networkName }))
  const blockNumbers = await getDistributionBlockNumbers()
  const balancesByDate = await seqMap(blockNumbers, blockNumber => getERC20BalancesAtBlockTagPaginated(blockNumber, deployment.address, context))
  const balances = addBalances(flatten(balancesByDate))
  return getClaimsFromBalances(balances)
}

export async function getDistributionBlockNumbers(): Promise<BlockNumber[]> {
  const dates = await getDistributionDates()
  const blocks = dates.map(date => ensure(findClosestBlock(date)))
  return blocks.map(b => b.number)
}

export async function getDistributionDates(): Promise<Date[]> {
  const indexes = range(airdropStageSuccessCount, airdropStageMaxCount)
  const timestamps = indexes.map(airdropStageIndex => airdropStartTimestamp + airdropStageDuration * airdropStageIndex)
  return timestamps.map(t => new Date(t))
}
