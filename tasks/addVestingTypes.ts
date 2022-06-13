import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getRunnableContext, RunnableContext } from '../util/context/getRunnableContext'
import { RunnableTaskArguments } from '../util/RunnableTaskArguments'
import { Writable } from '../util/writable'
import { Filename } from '../util/filesystem'
import { importDefault } from '../util/import'
import { addVestingTypes } from '../test/support/Vesting.helpers'
import { getGenericTokenWithVesting } from './util/getToken'
import { Address } from '../models/Address'
import { logAndWaitForTransactions } from './util/transaction'
import { sortBy } from 'lodash'

export async function addVestingTypesTask(args: AddVestingTypesTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getAddVestingTypesContext(args, hre)
  const { contractAddress, ethers, log } = context
  const token = await getGenericTokenWithVesting(contractAddress, ethers)
  const vestingTypes = await getVestingTypes(context.vestingTypes)
  const transactions = await addVestingTypes(token, vestingTypes)
  const minConfirmations = 1
  await logAndWaitForTransactions(context, minConfirmations, transactions)
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
