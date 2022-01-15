import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { upperCase } from 'lodash'
import { withFeeData } from '../util/network'
import { Address } from '../models/Address'

export async function deployContractTask(args: DeployGenericTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<DeployGenericTokenTaskOutput> {
  const { ethers, upgrades, network, run } = hre
  const { contract: contractName, upgradeable, constructorArgsModule, constructorArgsParams } = args
  const [deployer] = await ethers.getSigners()
  const feeData = await deployer.getFeeData()
  const envVarContract = upperCase(contractName).replace(/\s/g, '_')
  const constructorArgs: unknown[] = await run('verify:get-constructor-arguments', {
    constructorArgsModule,
    constructorArgsParams,
  })
  console.info(`NETWORK = ${network.name}`)
  console.info(`export ${envVarContract}_DEPLOYER=${deployer.address}`)

  const factory = await ethers.getContractFactory(contractName)
  let addressToVerify: string

  if (upgradeable) {
    const contract = await upgrades.deployProxy(factory)
    await contract.deployed()
    const proxyAddress = contract.address
    console.info(`export ${envVarContract}_PROXY_ADDRESS=${proxyAddress}`) // eslint-disable-line no-console
    const implementationAddress = await getImplementationAddress(ethers.provider, contract.address)
    console.info(`export ${envVarContract}_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
    await run('verify', {
      address: implementationAddress,
      // constructorArgs* not needed since the implementation contract constructor has zero arguments
    })
    return { upgradeable, proxyAddress, implementationAddress }
  } else {
    const contract = await factory.deploy(...constructorArgs, withFeeData(feeData, {
      // TODO: Fix "transaction type not supported" when deploying to legacy chains (e.g. BSC)
      // maxPriorityFeePerGas: BigNumber.from("2500000000"),
      // maxFeePerGas: BigNumber.from(network.config.gasPrice),

      // gasLimit: 8000000,
    }))
    await contract.deployed()
    const address = contract.address
    console.info(`export ${envVarContract}_ADDRESS=${address}`) // eslint-disable-line no-console
    await run('verify', {
      address,
      constructorArgs: constructorArgsModule,
      constructorArgsParams,
    })
    return { upgradeable, address }
  }

}

interface DeployGenericTokenTaskArguments {
  contract: string
  upgradeable: boolean
  constructorArgsModule?: string
  constructorArgsParams: string[]
}

type DeployGenericTokenTaskOutput = DeployGenericTokenTaskUpgradeableOutput | DeployGenericTokenTaskNonUpgradeableOutput

interface DeployGenericTokenTaskUpgradeableOutput {
  upgradeable: true
  proxyAddress: Address
  implementationAddress: Address
}

interface DeployGenericTokenTaskNonUpgradeableOutput {
  upgradeable: false
  address: Address
}
