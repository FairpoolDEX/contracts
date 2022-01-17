import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { upperCase } from 'lodash'
import { getOverrides } from '../util/network'
import { Address } from '../models/Address'
import { verify } from '../util/verify'
import { getProxyCheckerUrl } from '../util/url'

export async function deployContractTask(args: DeployGenericTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<DeployGenericTokenTaskOutput> {
  const { ethers, upgrades, network, run } = hre
  const { contract: contractName, upgradeable, constructorArgsModule, constructorArgsParams } = args
  const [deployer] = await ethers.getSigners()
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
    const contract = await upgrades.deployProxy(factory, constructorArgs)
    await contract.deployed()
    const proxyAddress = contract.address
    console.info(`export ${envVarContract}_PROXY_ADDRESS=${proxyAddress}`) // eslint-disable-line no-console
    const implementationAddress = await getImplementationAddress(ethers.provider, contract.address)
    console.info(`export ${envVarContract}_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
    await verify(run, {
      address: implementationAddress,
      // constructorArgs not needed since the implementation contract constructor has zero arguments
    })
    console.info(`IMPORTANT: Verify proxy manually using ${getProxyCheckerUrl(proxyAddress, contract.signer)}`)
    return { upgradeable, proxyAddress, implementationAddress }
  } else {
    const contract = await factory.deploy(...constructorArgs, {
      ...await getOverrides(deployer),
      // TODO: Fix "transaction type not supported" when deploying to legacy chains (e.g. BSC)
      // maxPriorityFeePerGas: BigNumber.from("2500000000"),
      // maxFeePerGas: BigNumber.from(network.config.gasPrice),
    })
    await contract.deployed()
    const address = contract.address
    console.info(`export ${envVarContract}_ADDRESS=${address}`) // eslint-disable-line no-console
    await verify(run, {
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

export type DeployGenericTokenTaskOutput = DeployGenericTokenTaskUpgradeableOutput | DeployGenericTokenTaskNonUpgradeableOutput

interface DeployGenericTokenTaskUpgradeableOutput {
  upgradeable: true
  proxyAddress: Address
  implementationAddress: Address
}

interface DeployGenericTokenTaskNonUpgradeableOutput {
  upgradeable: false
  address: Address
}
