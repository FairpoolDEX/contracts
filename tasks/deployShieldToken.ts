import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

import { SHIELD_RELEASE_TIME } from "../test/support/ShieldToken.helpers"

export async function deployShieldToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {

  const [deployer] = await hre.ethers.getSigners()
  console.log(`export SHLD_DEPLOYER=${deployer.address}`)

  const Token = await hre.ethers.getContractFactory("ShieldToken")
  const token = await hre.upgrades.deployProxy(Token, [SHIELD_RELEASE_TIME])
  await token.deployed()
  console.log(`export SHLD_PROXY_ADDRESS=${token.address}`) // eslint-disable-line no-console

  const implementationAddress = await getImplementationAddress(hre.ethers.provider, token.address)
  console.log(`export SHLD_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
}
