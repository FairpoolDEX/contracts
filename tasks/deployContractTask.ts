import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getOverrides } from '../util-local/network'
import { Address } from '../models/Address'
import { getConstructorArgs, verifyWithWorkaround } from '../util-local/verifyWithWorkaround'
import { toUpperSnakeCase } from '../util/string'
import { RunnableTaskArgumentsSchema } from '../util-local/RunnableTaskArguments'
import { z } from 'zod'
import { getRunnableContext, RunnableContext } from '../util-local/context/getRunnableContext'
import { getProxyCheckerUrl } from '../util/url'
import { getImplementationAddress } from '@openzeppelin/upgrades-core'

export async function deployNonUpgradeableContractTask(args: DeployContractTaskArguments, hre: HardhatRuntimeEnvironment) {
  const context = await getDeployContractContext(args, hre)
  return deployNonUpgradeableContract(context)
}

export async function deployUpgradeableContractTask(args: DeployContractTaskArguments, hre: HardhatRuntimeEnvironment) {
  const context = await getDeployContractContext(args, hre)
  return deployUpgradeableContract(context)
}

export async function deployNonUpgradeableContract(context: DeployContractContext): Promise<DeployNonUpgradeableContractOutput> {
  const { contractName, contractNameEnvVar: $contractNameEnvVar, constructorArgsModule, constructorArgsParams, verify, signer, ethers, network, log, run } = context

  const factory = await ethers.getContractFactory(contractName)
  const contractNameEnvVar = toUpperSnakeCase($contractNameEnvVar || contractName)
  const constructorArgs: unknown[] = await getConstructorArgs(run, constructorArgsModule, constructorArgsParams)
  log(`NETWORK = ${network.name}`)
  log(`export ${contractNameEnvVar}_DEPLOYER=${signer.address}`)

  const contract = await factory.deploy(...constructorArgs, {
    ...await getOverrides(signer),
  })
  await contract.deployed()
  const address = contract.address
  log(`export ${contractNameEnvVar}_ADDRESS=${address}`)

  if (verify) await verifyWithWorkaround(run, {
    address,
    constructorArgs: constructorArgsModule,
    constructorArgsParams,
  })

  return { address }
}

export async function deployUpgradeableContract(context: DeployContractContext): Promise<DeployUpgradeableContractOutput> {
  const { contractName, contractNameEnvVar: $contractNameEnvVar, constructorArgsModule, constructorArgsParams, verify, signer, ethers, upgrades, network, log, run } = context

  const factory = await ethers.getContractFactory(contractName)
  const contractNameEnvVar = toUpperSnakeCase($contractNameEnvVar || contractName)
  const constructorArgs: unknown[] = await getConstructorArgs(run, constructorArgsModule, constructorArgsParams)
  log(`NETWORK = ${network.name}`)
  log(`export ${contractNameEnvVar}_DEPLOYER=${signer.address}`)

  const contract = await upgrades.deployProxy(factory, constructorArgs)
  await contract.deployed()
  const proxyAddress = contract.address
  log(`export ${contractNameEnvVar}_PROXY_ADDRESS=${proxyAddress}`)
  const implementationAddress = await getImplementationAddress(ethers.provider, contract.address)
  log(`export ${contractNameEnvVar}_IMPLEMENTATION_ADDRESS=${implementationAddress}`)

  try {
    if (verify) await verifyWithWorkaround(run, {
      address: implementationAddress,
      // constructorArgs not needed since the implementation contract constructor has zero arguments
    })
  } finally {
    log(`IMPORTANT: Verify proxy manually using ${await getProxyCheckerUrl(proxyAddress, contract.signer)}`)
  }

  return { proxyAddress, implementationAddress }
}

const DeployContractTaskArgumentsSchema = RunnableTaskArgumentsSchema.extend({
  contractName: z.string(),
  contractNameEnvVar: z.string().optional(),
  constructorArgsModule: z.string().optional(),
  constructorArgsParams: z.array(z.string()).default([]),
  verify: z.boolean().default(true),
})

export type DeployContractTaskArguments = z.infer<typeof DeployContractTaskArgumentsSchema>

export function validateDeployContractTaskArguments(args: DeployContractTaskArguments): DeployContractTaskArguments {
  return DeployContractTaskArgumentsSchema.parse(args)
}

export interface DeployContractContext extends DeployContractTaskArguments, RunnableContext {

}

export async function getDeployContractContext(args: DeployContractTaskArguments, hre: HardhatRuntimeEnvironment): Promise<DeployContractContext> {
  return getRunnableContext(validateDeployContractTaskArguments(args), hre)
}

export interface DeployUpgradeableContractOutput {
  proxyAddress: Address
  implementationAddress: Address
}

export interface DeployNonUpgradeableContractOutput {
  address: Address
}

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
