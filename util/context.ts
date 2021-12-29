import { RunId } from './run'
import { Address } from '../models/Address'
import { NetworkName, NetworkNameSchema } from '../models/Network'
import { Logger } from './log'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Chunkable } from './chunkable'
import { pick } from 'lodash'
import { RunnableTaskArguments } from './task'

export interface RunnableContext {
  runId: RunId
  deployerAddress: Address
  networkName: NetworkName
  dry: boolean
  log: Logger
}

export async function getRunnableContext(args: RunnableTaskArguments, hre: HardhatRuntimeEnvironment): Promise<RunnableContext> {
  const { runId, dry } = args
  const { network, ethers } = hre
  const networkName = NetworkNameSchema.parse(network.name)
  const [deployer] = await ethers.getSigners()
  return {
    runId,
    networkName,
    deployerAddress: deployer.address,
    dry,
    log: console.info.bind(console),
  }
}

export async function getChunkableContext(args: Chunkable, hre: HardhatRuntimeEnvironment): Promise<Chunkable> {
  return pick(args, 'chunkSize')
}

export function isTest(context: RunnableContext) {
  return context.networkName === 'hardhat'
}
