import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

import { airdropClaimDuration, airdropStageDuration, airdropStartTimestamp } from "../test/support/BullToken.helpers"
import { burnRateDenominator, burnRateNumerator } from "../test/support/BullToken.helpers"

export async function deployBullToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { ethers, upgrades, network } = hre
  const [deployer] = await ethers.getSigners()
  console.log(`export BULL_DEPLOYER=${deployer.address}`)

  const _airdropStartTimestamp = network.name === 'mainnet' ? airdropStartTimestamp : Math.floor(new Date().getTime() / 1000)

  const Token = await ethers.getContractFactory("BullToken")
  const token = await upgrades.deployProxy(Token, [
    _airdropStartTimestamp,
    airdropClaimDuration,
    airdropStageDuration,
    burnRateNumerator,
    burnRateDenominator,
  ])
  await token.deployed()
  console.log(`export BULL_PROXY_ADDRESS=${token.address}`) // eslint-disable-line no-console

  const implementationAddress = await getImplementationAddress(ethers.provider, token.address)
  console.log(`export BULL_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
}
