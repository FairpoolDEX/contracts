import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getRunnableContext, RunnableContext } from '../utils-local/context/getRunnableContext'
import { RunnableTaskArguments } from '../utils-local/RunnableTaskArguments'
import { Writable } from '../utils-local/writable'
import { ensureQuoteDeltaMin } from '../test/support/Fairpool.helpers'
import { deployNonUpgradeableContract } from './deployContractTask'
import { Fairpool } from '../typechain-types'

/**
 * quoteDeltaMin grows with quoteBalanceOfContract (this is expected)
 * To multiply quoteDeltaMin by 2, quoteBalanceOfContract must be multiplied by 10 (likely because of ">> precision" in contract code)
 */
export async function getQuoteDeltaMinTask(args: GetQuoteDeltaMinTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getQuoteDeltaMinTaskContext(args, hre)
  const { ethers, log, network } = context
  if (network.name !== 'hardhat') throw new Error('"--network hardhat" is required')
  const { contract: fairpool } = await deployNonUpgradeableContract<Fairpool>({
    ...context,
    contractName: 'Fairpool',
    constructorArgsModule: './arguments/Fairpool.goerli.arguments',
    constructorArgsParams: [],
    verify: true,
    signerType: 'default',
  })
  const [owner, bob, sam] = await ethers.getSigners()
  await ensureQuoteDeltaMin(fairpool, bob, sam)
}

export interface GetQuoteDeltaMinTaskArguments extends RunnableTaskArguments, Writable {
}

export interface GetQuoteDeltaMinTaskContext extends GetQuoteDeltaMinTaskArguments, RunnableContext {
  // getNativeAssetPriceAtBlockNumber: (networkName: NetworkName, blockNumber: number) => Promise<AmountBN>
  // getTokenPriceAtBlockNumber: (networkName: NetworkName, tokenAddress: Address, blockNumber: number) => Promise<AmountBN>
}

export async function getQuoteDeltaMinTaskContext(args: GetQuoteDeltaMinTaskArguments, hre: HardhatRuntimeEnvironment): Promise<GetQuoteDeltaMinTaskContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}
