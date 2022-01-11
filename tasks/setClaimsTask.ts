import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { chunk } from '../test/support/all.helpers'
import { maxFeePerGas, maxPriorityFeePerGas } from '../util/gas'
import { BalancesMap, readBalances } from '../util/balance'
import { importExpectations } from '../util/expectation'
import { getChunkableContext, getRunnableContext, RunnableContext } from '../util/context'
import { Chunkable } from '../util/chunkable'
import { RunnableTaskArguments } from '../util/task'
import { logDryRun } from '../util/dry'
import { ContractName } from '../util/contract'
import { Address } from '../models/Address'
import { Filename } from '../util/filesystem'
import { BalanceBN } from '../models/BalanceBN'
import { AmountBN } from '../models/AmountBN'

export async function setClaimsTask(args: SetClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getSetClaimsContext(args, hre)
  const { contractName, contractAddress, balances: balancesFilename, expectations: expectationsFilename, dry, log, ethers } = context
  const expectations: SetClaimsExpectationsMap = await importExpectations(expectationsFilename)
  log('Parsing balances')
  const balances = await readBalances(balancesFilename)
  log(`Attaching to contract ${contractAddress}`)
  const Token = await ethers.getContractFactory(contractName)
  const token = await Token.attach(contractAddress)
  log('Setting claims')
  await setClaims(token, balances, expectations, context)
  if (dry) logDryRun(log)
}

export async function setClaims(token: any, claims: BalanceBN[], expectations: SetClaimsExpectationsMap, context: SetClaimsContext): Promise<void> {
  // const { network } = hre
  // const blockGasLimits = { ropsten: 8000000, mainnet: 30000000 }
  // const blockGasLimit = network.name === "ropsten" || network.name === "mainnet" ? blockGasLimits[network.name] : null
  // if (!blockGasLimit) throw new Error("Undefined blockGasLimit")
  const { chunkSize, dry, log } = context
  const claimsChunks = chunk(claims, chunkSize)
  for (let i = 0; i < claimsChunks.length; i++) {
    log(`Chunk ${i + 1} / ${claimsChunks.length}:`)
    const $claims = claimsChunks[i]
    // const $balancesForDisplay = $balances.map(balance => [balance.address, balance.amount.toString()])
    // log(fromPairs(entriesForDisplay))
    const addresses = $claims.map(b => b.address)
    const amounts = $claims.map(b => b.amount)
    if (!dry) {
      const tx = await token.setClaims(addresses, amounts, { gasLimit: 8000000, maxFeePerGas, maxPriorityFeePerGas })
      log(`TX Hash: ${tx.hash}`)
    }
  }
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
  balances: Filename
  airdropStageShareNumerator: number
  airdropStageShareDenominator: number
  airdropRate: number
  expectations: Filename
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
