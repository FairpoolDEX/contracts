import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getRunnableContext, RunnableContext } from '../util/context/getRunnableContext'
import { RunnableTaskArguments } from '../util/RunnableTaskArguments'
import { Writable } from '../util/writable'
import { Filename } from '../util/filesystem'
import { importDefault } from '../util/import'
import { getGenericTokenWithVesting } from './util/getToken'
import { Address } from '../models/Address'
import { logAndWaitForTransactions } from './util/transaction'
import { concat, sortBy } from 'lodash'
import { addVestedAllocations, getAllocations, splitAllocations } from '../test/support/Allocation.helpers'
import { AmountBN } from '../models/AmountBN'
import { transferManyBalanceBN } from '../test/support/TransferMany.helpers'

export async function addAllocationsTask(args: AddAllocationsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getAddAllocationsContext(args, hre)
  const { contractAddress, totalAmount, ethers, log } = context
  const token = await getGenericTokenWithVesting(contractAddress, ethers)
  const vestingTypes = await getVestingTypes(context.vestingTypes)
  const allocations = await getAllocations(totalAmount, context.allocations)
  const { vested, unvested } = splitAllocations(allocations)
  const vestedTransactions = await addVestedAllocations(context, token, vestingTypes, vested)
  const unvestedTransactions = await transferManyBalanceBN(context, token, unvested, 400)
  const allTransactions = concat(vestedTransactions, unvestedTransactions)
  const minConfirmations = 1
  await logAndWaitForTransactions(context, minConfirmations, allTransactions)
}

async function getVestingTypes(filename: Filename) {
  const types = await importDefault(filename)
  return sortBy(types, t => t.smartContractIndex)
}

export interface AddAllocationsTaskArguments extends RunnableTaskArguments, Writable {
  allocations: Filename
  vestingTypes: Filename
  contractAddress: Address
  totalAmount: AmountBN
}

export interface AddAllocationsContext extends AddAllocationsTaskArguments, RunnableContext {
  // getNativeAssetPriceAtBlockNumber: (networkName: NetworkName, blockNumber: number) => Promise<AmountBN>
  // getTokenPriceAtBlockNumber: (networkName: NetworkName, tokenAddress: Address, blockNumber: number) => Promise<AmountBN>
}

export async function getAddAllocationsContext(args: AddAllocationsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<AddAllocationsContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}
