import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

import { airdropClaimDuration, airdropStageDuration, airdropStartTimestamp } from "../test/support/BullToken.helpers"
import { burnRateDenominator, burnRateNumerator } from "../test/support/BullToken.helpers"

export async function deployBullToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const [deployer] = await hre.ethers.getSigners()
  console.log(`export BULL_DEPLOYER=${deployer.address}`)

  const Token = await hre.ethers.getContractFactory("BullToken")
  const token = await hre.upgrades.deployProxy(Token, [airdropStartTimestamp, airdropClaimDuration, airdropStageDuration, burnRateNumerator, burnRateDenominator])
  await token.deployed()
  console.log(`export BULL_PROXY_ADDRESS=${token.address}`) // eslint-disable-line no-console

  const implementationAddress = await getImplementationAddress(hre.ethers.provider, token.address)
  console.log(`export BULL_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
}
