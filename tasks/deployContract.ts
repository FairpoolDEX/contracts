import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { upperCase } from "lodash"

export async function deployContract(args: DeployERC20TokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { ethers, upgrades, network, run } = hre
  const { contract, upgradeable, constructorArgsModule, constructorArgsParams } = args
  const [deployer] = await ethers.getSigners()
  const envVarContract = upperCase(contract).replace(/\s/g, "_")
  const constructorArguments: unknown[] = await run("verify:get-constructor-arguments", {
    constructorArgsModule,
    constructorArgsParams,
  })
  console.info(`[INFO] Deploying to ${network.name}`)
  console.info(`export ${envVarContract}_DEPLOYER=${deployer.address}`)

  const Token = await ethers.getContractFactory(contract)
  let addressToVerify: string

  if (upgradeable) {
    const token = await upgrades.deployProxy(Token, constructorArguments)
    await token.deployed()
    console.info(`export ${envVarContract}_PROXY_ADDRESS=${token.address}`) // eslint-disable-line no-console
    const implementationAddress = await getImplementationAddress(ethers.provider, token.address)
    console.info(`export ${envVarContract}_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
    addressToVerify = implementationAddress
  } else {
    const token = await Token.deploy(...constructorArguments)
    await token.deployed()
    console.info(`export ${envVarContract}_ADDRESS=${token.address}`) // eslint-disable-line no-console
    addressToVerify = token.address
  }

  await run("verify", {
    address: addressToVerify,
    // constructorArgs not needed since the implementation contract constructor has zero arguments
  })
}

interface DeployERC20TokenTaskArguments {
  contract: string
  upgradeable: boolean
  constructorArgsModule?: string
  constructorArgsParams: string[]
}
