import { Address } from '../models/Address'
import { NetworkName, NetworkNameSchema } from '../models/NetworkName'
import { Logger } from './log'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Chunkable } from './chunkable'
import { pick } from 'lodash'
import { RunnableTaskArguments } from './task'
import { RunTaskFunction } from 'hardhat/types/runtime'
import { createFsCache, getFsCachePathForContracts } from './cache'
import { Cache } from 'cache-manager'

export interface RunnableContext extends RunnableTaskArguments, HardhatRuntimeEnvironment {
  run: RunTaskFunction,
  deployerAddress: Address
  networkName: NetworkName
  cache: Cache
  log: Logger
}

export async function getRunnableContext<Args extends RunnableTaskArguments>(args: Args, hre: HardhatRuntimeEnvironment): Promise<RunnableContext> {
  const { ethers, network } = hre
  const { cacheKey } = args
  const networkName = NetworkNameSchema.parse(network.name)
  const [deployer] = await ethers.getSigners()
  const cache = createFsCache({ path: getFsCachePathForContracts(`/${cacheKey}`) })
  return {
    ...hre,
    ...args,
    networkName,
    deployerAddress: deployer.address,
    cache,
    log: console.info.bind(console),
  }
}

export async function getChunkableContext(args: Chunkable, hre: HardhatRuntimeEnvironment): Promise<Chunkable> {
  return pick(args, 'chunkSize')
}

export function isTest(context: RunnableContext) {
  return context.networkName === 'hardhat'
}
