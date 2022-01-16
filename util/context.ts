import { Address } from '../models/Address'
import { NetworkName, NetworkNameSchema } from '../models/NetworkName'
import { Logger } from './log'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Chunkable } from './chunkable'
import { pick } from 'lodash'
import { RunnableTaskArguments } from './task'
import { RunTaskFunction } from 'hardhat/types/runtime'

export interface RunnableContext extends RunnableTaskArguments, HardhatRuntimeEnvironment {
  run: RunTaskFunction,
  deployerAddress: Address
  networkName: NetworkName
  log: Logger
}

export async function getRunnableContext<Args extends RunnableTaskArguments>(args: Args, hre: HardhatRuntimeEnvironment): Promise<RunnableContext> {
  const { ethers, network } = hre
  const networkName = NetworkNameSchema.parse(network.name)
  const [deployer] = await ethers.getSigners()
  return {
    ...hre,
    ...args,
    networkName,
    deployerAddress: deployer.address,
    log: console.info.bind(console),
  }
}

export async function getChunkableContext(args: Chunkable, hre: HardhatRuntimeEnvironment): Promise<Chunkable> {
  return pick(args, 'chunkSize')
}

export function isTest(context: RunnableContext) {
  return context.networkName === 'hardhat'
}
