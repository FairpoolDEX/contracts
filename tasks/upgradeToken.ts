import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"

export async function upgradeToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { name, address } = args
  const { ethers, upgrades } = hre
  // const [deployer] = await ethers.getSigners()
  const Token = await ethers.getContractFactory(name)
  const token = await upgrades.upgradeProxy(address, Token)
  console.log(`${name} upgraded`)
}
