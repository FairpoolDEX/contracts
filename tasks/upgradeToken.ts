import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import * as ethers from "ethers"

export async function upgradeToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { name, address } = args
  const { ethers, upgrades } = hre
  // const [deployer] = await ethers.getSigners()
  const Token = await ethers.getContractFactory(name) as ethers.ContractFactory
  const token = await upgrades.upgradeProxy(address, Token)
  console.log(`${name} upgraded`)
  console.log(`Don't forget to verify the implementation contract!`)

  const prefix = name.replace('Token', '').toUpperCase()
  const implementationAddress = await getImplementationAddress(ethers.provider, token.address)
  console.log(`export ${prefix}_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
}
