import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import { z } from 'zod'
import { Address, AddressSchema } from '../models/Address'
import { getRunnableContext, RunnableContext } from '../util-local/context/getRunnableContext'
import { RunnableTaskArgumentsSchema } from '../util-local/RunnableTaskArguments'
import { verifyWithWorkaround } from '../util-local/verifyWithWorkaround'
import { toUpperSnakeCase } from '../util/toUpperSnakeCase'

export async function upgradeContractTask(args: UpgradeContractTaskArguments, hre: HardhatRuntimeEnvironment): Promise<UpgradeContractTaskOutput> {
  const context = await getUpgradeContractContext(args, hre)
  return upgradeContract(context)
}

export async function upgradeContract(context: UpgradeContractContext) {
  const { contractName, contractAddress, verify, ethers, upgrades, log, run } = context
  log(`Upgrading ${contractName}`)
  const Token = await ethers.getContractFactory(contractName)
  const token = await upgrades.upgradeProxy(contractAddress, Token)
  log(`Waiting for upgrade TX: ${token.deployTransaction.hash}`)
  await token.deployTransaction.wait(1)
  const contractNameEnvVar = toUpperSnakeCase(contractName)
  const implementationAddress = await getImplementationAddress(ethers.provider, token.address)
  log(`export ${contractNameEnvVar}_IMPLEMENTATION_ADDRESS=${implementationAddress}`)
  if (verify) await verifyWithWorkaround(run, {
    address: implementationAddress,
    // constructorArgs not needed since the implementation contract constructor has zero arguments
  })
  return { implementationAddress }
}

const UpgradeContractTaskArgumentsSchema = RunnableTaskArgumentsSchema.extend({
  contractName: z.string(),
  contractAddress: AddressSchema,
  verify: z.boolean().default(true),
})

type UpgradeContractTaskArguments = z.infer<typeof UpgradeContractTaskArgumentsSchema>

export function validateUpgradeContractTaskArguments(args: UpgradeContractTaskArguments): UpgradeContractTaskArguments {
  return UpgradeContractTaskArgumentsSchema.parse(args)
}

export interface UpgradeContractContext extends UpgradeContractTaskArguments, RunnableContext {

}

export async function getUpgradeContractContext(args: UpgradeContractTaskArguments, hre: HardhatRuntimeEnvironment): Promise<UpgradeContractContext> {
  return getRunnableContext(validateUpgradeContractTaskArguments(args), hre)
}

interface UpgradeContractTaskOutput {
  implementationAddress: Address
}
