import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { chunk } from '../test/support/all.helpers'
import { BalancesMap, optimizeForGasRefund, readBalances, sumAmountsOf } from '../util/balance'
import { getChunkableContext, getRunnableContext, RunnableContext } from '../util/context'
import { Chunkable } from '../util/chunkable'
import { RunnableTaskArguments } from '../util/task'
import { logDryRun } from '../util/dry'
import { ContractName } from '../util/contract'
import { Address } from '../models/Address'
import { Filename } from '../util/filesystem'
import { BalanceBN } from '../models/BalanceBN'
import { AmountBN } from '../models/AmountBN'
import { expect } from '../util/expect'
import { airdropDistributedTokenAmountTotal } from '../test/support/BullToken.helpers'
import { ensure } from '../util/ensure'
import { findDeployment } from '../data/allDeployments'
import { getBullToken } from './util/getToken'
import { BullToken } from '../typechain-types'
import { getOverrides } from '../util/network'

export async function setClaimsTask(args: SetClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getSetClaimsContext(args, hre)
  const { contractName, contractAddress, claims: claimsFilename, networkName, dry, log, ethers } = context
  const deployment = ensure(findDeployment({ contract: 'BullToken', network: networkName }))
  const claims = await getValidatedClaims(claimsFilename)
  const token = await getBullToken(deployment.address, ethers)
  await setClaims(token, claims, context)
  if (dry) logDryRun(log)
}

export async function setClaims(token: BullToken, claims: BalanceBN[], context: SetClaimsContext): Promise<void> {
  // const { network } = hre
  // const blockGasLimits = { ropsten: 8000000, mainnet: 30000000 }
  // const blockGasLimit = network.name === "ropsten" || network.name === "mainnet" ? blockGasLimits[network.name] : null
  // if (!blockGasLimit) throw new Error("Undefined blockGasLimit")
  const { chunkSize, dry, log } = context
  const claimsOptimized = optimizeForGasRefund(claims)
  const claimsChunks = chunk(claimsOptimized, chunkSize)
  for (let i = 0; i < claimsChunks.length; i++) {
    log(`Chunk ${i + 1} / ${claimsChunks.length}:`)
    const claimsChunk = claimsChunks[i]
    // const $balancesForDisplay = $balances.map(balance => [balance.address, balance.amount.toString()])
    // log(fromPairs(entriesForDisplay))
    const addresses = claimsChunk.map(b => b.address)
    const amounts = claimsChunk.map(b => b.amount)
    if (!dry) {
      const tx = await token.setClaims(addresses, amounts, await getOverrides(token.signer))
      log(`TX Hash: ${tx.hash}`)
    }
  }
}

async function getValidatedClaims(filename: Filename) {
  return validateClaims(await readBalances(filename))
}

function validateClaims(claims: BalanceBN[]) {
  expect(sumAmountsOf(claims)).to.be.lt(airdropDistributedTokenAmountTotal)
  return claims
}

// export async function parseShieldBalancesCSV(data: CSVData) {
//   return rewriteBalanceMap(shieldRewriteAddressMap, await parseBalancesCSV(data))
// }

export interface SetClaimsExpectationsMap {
  balances: BalancesMap,
  totalAmount: AmountBN,
}

export interface SetClaimsTaskArguments extends RunnableTaskArguments, Chunkable {
  contractName: ContractName
  contractAddress: Address
  claims: Filename
  airdropStageShareNumerator: number
  airdropStageShareDenominator: number
  airdropRate: number
}

export interface SetClaimsContext extends SetClaimsTaskArguments, RunnableContext {

}

export async function getSetClaimsContext(args: SetClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<SetClaimsContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
    ...await getChunkableContext(args, hre),
  }
}
