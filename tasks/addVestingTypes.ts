import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getRunnableContext, RunnableContext } from '../utils-local/context/getRunnableContext'
import { RunnableTaskArguments } from '../utils-local/RunnableTaskArguments'
import { Writable } from '../utils-local/writable'
import { importDefault } from '../utils-local/import'
import { addVestingTypes } from '../test/support/Vesting.helpers'
import { getGenericTokenWithVesting } from './util/getERC20Token'
import { Address } from '../models/Address'
import { sortBy } from 'lodash'
import { Filename } from '../libs/utils/filesystem'

export async function addVestingTypesTask(args: AddVestingTypesTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getAddVestingTypesContext(args, hre)
  const { contractAddress, ethers, log } = context
  const token = await getGenericTokenWithVesting(contractAddress, ethers)
  const vestingTypes = await getVestingTypes(context.vestingTypes)
  const transactions = await addVestingTypes(context, token, vestingTypes)
  // const minConfirmations = 1
  // await logAndWaitForTransactions(context, minConfirmations, transactions)
}

async function getVestingTypes(filename: Filename) {
  const types = await importDefault(filename)
  return sortBy(types, t => t.smartContractIndex)
}

export interface AddVestingTypesTaskArguments extends RunnableTaskArguments, Writable {
  vestingTypes: Filename
  contractAddress: Address
}

export interface AddVestingTypesContext extends AddVestingTypesTaskArguments, RunnableContext {
  // getNativeAssetPriceAtBlockNumber: (networkName: NetworkName, blockNumber: number) => Promise<AmountBN>
  // getTokenPriceAtBlockNumber: (networkName: NetworkName, tokenAddress: Address, blockNumber: number) => Promise<AmountBN>
}

export async function getAddVestingTypesContext(args: AddVestingTypesTaskArguments, hre: HardhatRuntimeEnvironment): Promise<AddVestingTypesContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}
