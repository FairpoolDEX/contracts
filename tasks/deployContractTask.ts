import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getOverrides } from '../util/network'
import { Address } from '../models/Address'
import { verify } from '../util/verify'
import { getProxyCheckerUrl } from '../util/url'
import { toUpperSnakeCase } from '../util/string'

export async function deployContractTask(args: DeployGenericTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<DeployGenericTokenTaskOutput> {
  const { ethers, upgrades, network, run } = hre
  const { contract: contractName, upgradeable, constructorArgsModule, constructorArgsParams } = args
  const [deployer] = await ethers.getSigners()
  const contractNameEnvVar = toUpperSnakeCase(contractName)
  const constructorArgs: unknown[] = await run('verify:get-constructor-arguments', {
    constructorArgsModule,
    constructorArgsParams,
  })
  console.info(`NETWORK = ${network.name}`)
  console.info(`export ${contractNameEnvVar}_DEPLOYER=${deployer.address}`)

  const factory = await ethers.getContractFactory(contractName)
  let addressToVerify: string

  if (upgradeable) {
    const contract = await upgrades.deployProxy(factory, constructorArgs)
    await contract.deployed()
    const proxyAddress = contract.address
    console.info(`export ${contractNameEnvVar}_PROXY_ADDRESS=${proxyAddress}`) // eslint-disable-line no-console
    const implementationAddress = await getImplementationAddress(ethers.provider, contract.address)
    console.info(`export ${contractNameEnvVar}_IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
    console.info(`IMPORTANT: Verify proxy manually using ${await getProxyCheckerUrl(proxyAddress, contract.signer)}`)
    await verify(run, {
      address: implementationAddress,
      // constructorArgs not needed since the implementation contract constructor has zero arguments
    })
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
    console.info(`export ${contractNameEnvVar}_ADDRESS=${address}`) // eslint-disable-line no-console
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

export interface DeployGenericTokenTaskUpgradeableOutput {
  upgradeable: true
  proxyAddress: Address
  implementationAddress: Address
}

export interface DeployGenericTokenTaskNonUpgradeableOutput {
  upgradeable: false
  address: Address
}

/**
 * Deploy Bull token
 * - Modify deployContractTask to support hardware wallets
 * - Deploy from the old deployer address + change ownership
 *  - Faster
 *  - But may need to change it back
 *  - But need to rewrite the claims from old deployer to T deployer (easy)
 */

/**
 * Modify deployContractTask to support hardware wallets
 *
 * Options:
 * - Use Frame: https://github.com/nomiclabs/hardhat/issues/1159#issuecomment-789310120
 *  - But how to deploy upgradeable contracts?
 *    - Pass a signer
 *      - But need to implement a signer
 * - Use trezor-signer: https://github.com/weidex-team/weidex-trezor-signer-ethers/blob/master/lib/index.ts
 * - Implement trezor-signer
 *  - Use https://www.npmjs.com/package/@anders-t/ethers-ledger
 *
 */
