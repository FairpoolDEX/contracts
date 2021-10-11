import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { upperCase } from "lodash"
import { BigNumber } from "ethers"

export async function deployContract(args: DeployERC20TokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { ethers, upgrades, network, run } = hre
  const { contract: contractName, upgradeable, constructorArgsModule, constructorArgsParams } = args
  const [deployer] = await ethers.getSigners()
  const envVarContract = upperCase(contractName).replace(/\s/g, "_")
  const constructorArgs: unknown[] = await run("verify:get-constructor-arguments", {
    constructorArgsModule,
    constructorArgsParams,
  })
  console.info(`NETWORK = ${network.name}`)
  console.info(`export ${envVarContract}_DEPLOYER=${deployer.address}`)

  const factory = await ethers.getContractFactory(contractName)
  let addressToVerify: string

  if (upgradeable) {
    const contract = await upgrades.deployProxy(factory, constructorArgs /* TODO: set this: {
      maxPriorityFeePerGas: BigNumber.from("2500000000"),
    }*/)
    await contract.deployed()
    console.info(`export ${envVarContract}_PROXY_ADDRESS=${contract.address}`) // eslint-disable-line no-console
    const implementationAddress = await getImplementationAddress(ethers.provider, contract.address)
    console.info(`export ${envVarContract}_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
    await run("verify", {
      address: implementationAddress,
      // constructorArgs* not needed since the implementation contract constructor has zero arguments
    })
  } else {
    const contract = await factory.deploy(...constructorArgs, {
      // TODO: Fix "transaction type not supported" when deploying to legacy chains (e.g. BSC)
      // maxPriorityFeePerGas: BigNumber.from("2500000000"),
      // maxFeePerGas: BigNumber.from(network.config.gasPrice),

      // gasLimit: 8000000,
    })
    await contract.deployed()
    console.info(`export ${envVarContract}_ADDRESS=${contract.address}`) // eslint-disable-line no-console
    await run("verify", {
      address: contract.address,
      constructorArgs: constructorArgsModule,
      constructorArgsParams,
    })
  }

}

interface DeployERC20TokenTaskArguments {
  contract: string
  upgradeable: boolean
  constructorArgsModule?: string
  constructorArgsParams: string[]
}
