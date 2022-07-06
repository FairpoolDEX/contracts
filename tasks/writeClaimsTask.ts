import { concat, flatten, range } from 'lodash'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { addBalances, writeBalancesJSON } from '../util-local/balance'
import { Expected } from '../util-local/expectation'
import { getRunnableContext, RunnableContext } from '../util-local/context/getRunnableContext'
import { RunnableTaskArguments } from '../util-local/RunnableTaskArguments'
import { Writable } from '../util-local/writable'
import { airdropStageDuration, airdropStageMaxCount, airdropStageSuccessCount, airdropStartTimestamp, fromShieldToBull, pausedAt } from '../test/support/BullToken.helpers'
import { getERC20BalancesAtBlockTagPaginated } from './util/getERC20Data'
import { getClaimsFromBalances } from './util/balance'
import { findClosestBlock } from '../data/allBlocks'
import { ensure } from '../util/ensure'
import { isBullSellerBalance, Jordan, oldSoftwareDeployer } from '../data/allAddresses'
import { findDeployment } from '../data/allDeployments'
import { seqMap } from '../util/promise'
import { ContextualValidator, validateWithContext } from '../util-local/validator'
import { balanceBN, BalanceBN } from '../models/BalanceBN'
import { BlockNumber } from '../models/BlockNumber'
import { moveBalances } from '../models/BalanceBN/moveBalances'
import { getJordanBalanceOfShieldToken } from '../test/expectations/writeClaims.rebrand'
import { zero } from '../util/bignumber'
import { Address } from '../models/Address'
import { Filename } from '../util/filesystem'
import { getRewritesFromCSVFile } from '../models/Rewrite/getRewritesFromCSVFile'
import { Rewrite } from '../models/Rewrite'
import { applyRewrites } from '../models/Rewrite/applyRewrites'
import { importDefault } from '../util-local/import'
import { CachedContext, CachedTaskArguments, getCachedContext } from '../util-local/context/getCachedContext'

export async function writeClaimsTask(args: WriteClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getWriteClaimsContext(args, hre)
  const { rewrites: rewritesPath, expectations: expectationsPath, out, log } = context
  const rewrites = await getRewritesFromCSVFile(rewritesPath)
  const validators = await importDefault(expectationsPath)
  const $claims = await getClaimsFromRequests(rewrites, context)
  const claims = await validateWithContext($claims, validators, context)
  await writeBalancesJSON(claims, out)
  // const claimsReplaced = claims.map(c => ({ ...c, amount: zero }))
  // await writeClaims(claimsReplaced, out)
}

// export async function getClaimsFromFiles(nextFolder: Filename, prevFolder: Filename, retroFolder: Filename, blacklistFolder: Filename, context: WriteClaimsContext) {
//   const { cache, log } = context
//   log('Parsing balances')
//   const nextFolderFiles = getFiles(nextFolder)
//   const prevFolderFiles = getFiles(prevFolder)
//   const retroFolderFiles = getFiles(retroFolder)
//   const blacklistFolderFiles = getFiles(blacklistFolder)
//   const multiply = getMultiplier(airdropStageShareNumerator, airdropStageShareDenominator, airdropRate)
//   const balancesOfAllMap = await getShieldBalancesForBullAirdropFinal(nextFolderFiles, prevFolderFiles, retroFolderFiles, blacklistFolderFiles)
//   const balancesOfAll = getBalancesFromMap(balancesOfAllMap)
//   const balancesOfHumans = await unwrapSmartContractBalancesAtBlockTag(balancesOfAll, getBlockTag(), context)
//   const claims = balancesOfHumans.map(b => ({ ...b, amount: multiply(b.amount) }))
//   return optimizeForGasRefund(claims)
// }
//
// function getBlockTag(): string {
//   throw impl()
// }

export type WriteClaimsValidator = ContextualValidator<BalanceBN[], WriteClaimsContext>

export interface WriteClaimsTaskArguments extends RunnableTaskArguments, CachedTaskArguments, Writable, Expected {
  rewrites: Filename
}

export interface WriteClaimsContext extends WriteClaimsTaskArguments, CachedContext, RunnableContext {

}

export async function getWriteClaimsContext(args: WriteClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<WriteClaimsContext> {
  return {
    ...args,
    ...await getCachedContext(args, hre),
    ...await getRunnableContext(args, hre),
  }
}

export async function getClaimsFromRequests(rewrites: Rewrite[], context: WriteClaimsContext) {
  const claimsFromBullToken = await getClaimsFromBullToken(context)
  const claimsFromShieldToken = await getClaimsFromColiToken(context)
  let claims: BalanceBN[] = []
  claims = addBalances(concat(claimsFromBullToken, claimsFromShieldToken))
  claims = addBalances(setJordanClaims(claims, oldSoftwareDeployer))
  claims = addBalances(applyRewrites(rewrites, claims))
  return claims.filter(c => !isBullSellerBalance(c))
}

export async function getClaimsFromBullToken(context: WriteClaimsContext) {
  const deployment = ensure(findDeployment({ contract: 'BullToken', network: context.networkName }))
  return getERC20BalancesAtBlockTagPaginated(pausedAt + 1, deployment.address, context)
}

export async function getClaimsFromColiToken(context: WriteClaimsContext) {
  const deployment = ensure(findDeployment({ contract: 'ColiToken', network: context.networkName }))
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

function setJordanClaims(claims: BalanceBN[], from: Address) {
  const to = Jordan
  const amount = fromShieldToBull(getJordanBalanceOfShieldToken()).mul(3)
  const $claims = concat(claims, [balanceBN(to, zero)])
  return moveBalances($claims, from, to, amount)
}

/**
 * Using a large number because the transfers & balances at specific blocks are static data (can be persisted indefinitely)
 */
export const writeClaimsTaskCacheTtl = Number.MAX_SAFE_INTEGER
