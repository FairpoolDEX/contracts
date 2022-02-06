import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { chunk } from '../test/support/all.helpers'
import { BalancesMap, optimizeForGasRefund, readBalances, sumAmountsOf } from '../util/balance'
import { getRunnableContext, RunnableContext } from '../util/context/getRunnableContext'
import { RunnableTaskArguments } from '../util/RunnableTaskArguments'
import { Address } from '../models/Address'
import { Filename } from '../util/filesystem'
import { BalanceBN } from '../models/BalanceBN'
import { AmountBN } from '../models/AmountBN'
import { expect } from '../util/expect'
import { airdropDistributedTokenAmountTotal } from '../test/support/BullToken.helpers'
import { getBullTokenFromDeployment } from './util/getToken'
import { BullToken } from '../typechain-types'
import { getOverrides } from '../util/network'
import { ContractName } from '../models/ContractName'
import { Chunked, getChunkedContext } from '../util/context/getChunkedContext'

export async function setClaimsTask(args: SetClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getSetClaimsContext(args, hre)
  const { contractName, contractAddress, claims: claimsFilename, networkName, log, ethers } = context
  const token = await getBullTokenFromDeployment(networkName, ethers)
  const claims = await getValidatedClaims(claimsFilename)
  await setClaims(token, claims, context)
}

export async function setClaims(token: BullToken, claims: BalanceBN[], context: SetClaimsContext): Promise<void> {
  // const { network } = hre
  // const blockGasLimits = { ropsten: 8000000, mainnet: 30000000 }
  // const blockGasLimit = network.name === "ropsten" || network.name === "mainnet" ? blockGasLimits[network.name] : null
  // if (!blockGasLimit) throw new Error("Undefined blockGasLimit")
  const { chunkSize, log } = context
  const claimsOptimized = optimizeForGasRefund(claims)
  const claimsChunks = chunk(claimsOptimized, chunkSize)
  for (let i = 0; i < claimsChunks.length; i++) {
    log(`Chunk ${i + 1} / ${claimsChunks.length}:`)
    const claimsChunk = claimsChunks[i]
    // const $balancesForDisplay = $balances.map(balance => [balance.address, balance.amount.toString()])
    // log(fromPairs(entriesForDisplay))
    const addresses = claimsChunk.map(b => b.address)
    const amounts = claimsChunk.map(b => b.amount)
    {
      const tx = await token.setClaims(addresses, amounts, await getOverrides(token.signer))
      log(`TX Hash: ${tx.hash}`)
    }
  }
}

async function getValidatedClaims(filename: Filename) {
  return validateClaims(await readBalances(filename))
}

function validateClaims(claims: BalanceBN[]) {
  expect(sumAmountsOf(claims)).to.be.lte(airdropDistributedTokenAmountTotal)
  return claims
}

// export async function parseShieldBalancesCSV(data: CSVData) {
//   return rewriteBalanceMap(shieldRewriteAddressMap, await parseBalancesCSV(data))
// }

export interface SetClaimsExpectationsMap {
  balances: BalancesMap,
  totalAmount: AmountBN,
}

export interface SetClaimsTaskArguments extends RunnableTaskArguments, Chunked {
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
    ...await getChunkedContext(args, hre),
  }
}
