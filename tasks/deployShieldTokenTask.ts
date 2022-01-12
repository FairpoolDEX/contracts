import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'

import { releaseTimeTest } from '../test/support/ShieldToken.helpers'

export async function deployShieldTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { ethers, upgrades, network } = hre
  const [deployer] = await ethers.getSigners()
  console.info(`NETWORK = ${network.name}`)
  console.log(`export SHLD_DEPLOYER=${deployer.address}`)

  const Token = await ethers.getContractFactory('ShieldToken')
  const token = await upgrades.deployProxy(Token, [releaseTimeTest])
  await token.deployed()
  console.log(`export SHLD_PROXY_ADDRESS=${token.address}`) // eslint-disable-line no-console

  const implementationAddress = await getImplementationAddress(ethers.provider, token.address)
  console.log(`export SHLD_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
}
