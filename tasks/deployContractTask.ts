import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getOverrides } from '../utils-local/network'
import { Address } from '../models/Address'
import { getConstructorArgs, verifyWithWorkaround } from '../utils-local/verifyWithWorkaround'
import { RunnableTaskArgumentsSchema } from '../utils-local/RunnableTaskArguments'
import { z } from 'zod'
import { getRunnableContext, RunnableContext } from '../utils-local/context/getRunnableContext'
import { getProxyCheckerUrl } from '../utils/url'
import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import { toUpperSnakeCase } from '../utils/toUpperSnakeCase'
import { expect } from 'libs/utils/chai'
import { Contract } from 'ethers'

export async function deployNonUpgradeableContractTask(args: DeployContractTaskArguments, hre: HardhatRuntimeEnvironment) {
  const context = await getDeployContractContext(args, hre)
  return deployNonUpgradeableContract(context)
}

export async function deployUpgradeableContractTask(args: DeployContractTaskArguments, hre: HardhatRuntimeEnvironment) {
  const context = await getDeployContractContext(args, hre)
  return deployUpgradeableContract(context)
}

export async function deployNonUpgradeableContract<C extends Contract>(context: DeployContractContext): Promise<DeployNonUpgradeableContractOutput<C>> {
  const { contractName, contractNameEnvVar: $contractNameEnvVar, constructorArgsModule, constructorArgsParams, verify, ethers, artifacts, network, log, run } = context

  const signer = await getSigner(context)
  const signerAddress = await signer.getAddress()
  const factory = (await ethers.getContractFactory(contractName)).connect(signer)
  const artifact = await artifacts.readArtifact(contractName)
  const contractFullName = `${artifact.sourceName}:${artifact.contractName}`
  const contractNameEnvVar = toUpperSnakeCase($contractNameEnvVar || contractName)
  const constructorArgs: unknown[] = await getConstructorArgs(run, constructorArgsModule, constructorArgsParams)
  log(`NETWORK = ${network.name}`)
  log(`export ${contractNameEnvVar}_DEPLOYER=${signerAddress}`)

  const contract = await factory.deploy(...constructorArgs, {
    ...await getOverrides(signer),
  }) as C
  await contract.deployTransaction.wait(5) // per hardhat recommendation
  const address = contract.address
  log(`export ${contractNameEnvVar}_ADDRESS=${address}`)

  if (verify) await verifyWithWorkaround(run, {
    address,
    constructorArgs: constructorArgsModule,
    constructorArgsParams,
    contract: contractFullName,
  })

  return { contract }
}

export async function deployUpgradeableContract(context: DeployContractContext): Promise<DeployUpgradeableContractOutput> {
  const { contractName, contractNameEnvVar: $contractNameEnvVar, constructorArgsModule, constructorArgsParams, verify, ethers, upgrades, artifacts, network, log, run } = context

  const signer = await getSigner(context)
  const signerAddress = await signer.getAddress()
  const factory = (await ethers.getContractFactory(contractName)).connect(signer)
  const artifact = await artifacts.readArtifact(contractName)
  const contractFullName = `${artifact.sourceName}:${artifact.contractName}`
  const contractNameEnvVar = toUpperSnakeCase($contractNameEnvVar || contractName)
  const constructorArgs: unknown[] = await getConstructorArgs(run, constructorArgsModule, constructorArgsParams)
  log(`NETWORK = ${network.name}`)
  log(`export ${contractNameEnvVar}_DEPLOYER=${signerAddress}`)

  const contract = await upgrades.deployProxy(factory, constructorArgs)
  await contract.deployTransaction.wait(5) // per hardhat recommendation
  const proxyAddress = contract.address
  log(`export ${contractNameEnvVar}_PROXY_ADDRESS=${proxyAddress}`)
  const implementationAddress = await getImplementationAddress(ethers.provider, contract.address)
  log(`export ${contractNameEnvVar}_IMPLEMENTATION_ADDRESS=${implementationAddress}`)

  try {
    if (verify) await verifyWithWorkaround(run, {
      address: implementationAddress,
      // constructorArgs not needed since the implementation contract constructor has zero arguments
      contract: contractFullName,
    })
  } finally {
    log(`IMPORTANT: Verify proxy manually using ${await getProxyCheckerUrl(proxyAddress, contract.signer)}`)
  }

  return { proxyAddress, implementationAddress }
}

async function getSigner(context: DeployContractContext) {
  const { signer, deployer, ethers, signerType } = context
  switch (signerType) {
    case 'default':
      if (deployer) expect(signer.address).to.equal(deployer, 'Signer address must be equal to deployer address')
      return signer
    case 'rpc':
      return ethers.provider.getSigner(deployer)
    default:
      throw new Error(`Unknown signer type "${signerType}"`)
  }
}

const DeployContractTaskArgumentsSchema = RunnableTaskArgumentsSchema.extend({
  contractName: z.string(),
  contractNameEnvVar: z.string().optional(),
  constructorArgsModule: z.string().optional(),
  constructorArgsParams: z.array(z.string()).default([]),
  verify: z.boolean().default(true),
  signerType: z.enum(['default', 'rpc']).default('default'),
  deployer: z.string().min(1).optional(),
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

export interface DeployNonUpgradeableContractOutput<C extends Contract> {
  contract: C
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
