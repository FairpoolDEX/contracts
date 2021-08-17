import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

import { shieldReleaseTime } from "../test/support/ShieldToken.helpers"

export async function deployShieldToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { ethers, upgrades, network } = hre
  const [deployer] = await ethers.getSigners()
  console.info(`[INFO] Deploying to ${network.name}`)
  console.log(`export SHLD_DEPLOYER=${deployer.address}`)

  const Token = await ethers.getContractFactory("ShieldToken")
  const token = await upgrades.deployProxy(Token, [shieldReleaseTime])
  await token.deployed()
  console.log(`export SHLD_PROXY_ADDRESS=${token.address}`) // eslint-disable-line no-console

  const implementationAddress = await getImplementationAddress(ethers.provider, token.address)
  console.log(`export SHLD_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
}
