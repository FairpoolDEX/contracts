import { Address } from '../models/Address'
import { NetworkName, NetworkNameSchema } from '../models/Network'
import { Logger } from './log'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Chunkable } from './chunkable'
import { pick } from 'lodash'
import { RunnableTaskArguments } from './task'
import { Ethers } from './types'

export interface RunnableContext extends RunnableTaskArguments {
  ethers: Ethers
  deployerAddress: Address
  networkName: NetworkName
  log: Logger
}

export async function getRunnableContext<Args extends RunnableTaskArguments>(args: Args, hre: HardhatRuntimeEnvironment): Promise<RunnableContext> {
  const { network, ethers } = hre
  const networkName = NetworkNameSchema.parse(network.name)
  const [deployer] = await ethers.getSigners()
  return {
    ...args,
    ethers,
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
