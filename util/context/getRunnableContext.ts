import { NetworkName, NetworkNameSchema } from '../../models/NetworkName'
import { Logger } from '../log'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { RunnableTaskArguments } from '../RunnableTaskArguments'
import { RunTaskFunction } from 'hardhat/types/runtime'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

export interface RunnableContext extends RunnableTaskArguments, HardhatRuntimeEnvironment {
  run: RunTaskFunction,
  signer: SignerWithAddress
  networkName: NetworkName
  log: Logger
}

export async function getRunnableContext<Args extends RunnableTaskArguments>($args: Args, hre: HardhatRuntimeEnvironment): Promise<RunnableContext & Args> {
  const { ethers, network } = hre
  const networkName = NetworkNameSchema.parse(network.name)
  const [signer] = await ethers.getSigners()
  return {
    ...hre,
    ...$args,
    networkName,
    signer,
    log: console.info.bind(console),
  }
}

export function isTest(context: RunnableContext) {
  return context.networkName === 'hardhat'
}
