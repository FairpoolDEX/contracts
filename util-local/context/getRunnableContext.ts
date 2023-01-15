import { Logger } from '../log'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { RunnableTaskArguments } from '../RunnableTaskArguments'
import { RunTaskFunction } from 'hardhat/types/runtime'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Network } from '../../libs/ethereum/models/Network'
import { allNetworks } from '../../libs/ethereum/data/allNetworks'
import { ensureFind } from '../../libs/utils/ensure'

export interface RunnableContext extends RunnableTaskArguments, HardhatRuntimeEnvironment {
  run: RunTaskFunction,
  signer: SignerWithAddress
  log: Logger
  extra: {
    network: Network
  }
}

export async function getRunnableContext<Args extends RunnableTaskArguments>($args: Args, hre: HardhatRuntimeEnvironment): Promise<RunnableContext & Args> {
  const { ethers } = hre
  const network = ensureFind(allNetworks, n => n.name === hre.network.name)
  const [signer] = await ethers.getSigners()
  return {
    ...hre,
    ...$args,
    extra: { network },
    signer,
    log: console.info.bind(console),
  }
}

export function isTest(context: RunnableContext) {
  return context.extra.network.name === 'hardhat'
}
