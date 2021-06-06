import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

import { airdropClaimDuration, airdropStageDuration } from "../test/support/BullToken.helpers"
import { burnRateDenominator, burnRateNumerator } from "../test/support/BullToken.helpers"

export async function deployBullToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { ethers, upgrades, network } = hre
  const [deployer] = await ethers.getSigners()
  console.log(`export BULL_DEPLOYER=${deployer.address}`)

  const _airdropStartDate = network.name === 'mainnet' ? new Date("2021-06-04 13:00:00 UTC") : new Date()
  const _airdropStartTimestamp = Math.floor(_airdropStartDate.getTime() / 1000)

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
