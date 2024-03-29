import { GenericTokenWithVesting } from '../../typechain-types'
import { Allocation } from '../../models/Allocation'
import { expect } from '../../utils-local/expect'
import { readFile } from 'fs/promises'
import { uniq } from 'lodash'
import { ensure } from '../../utils/ensure'
import { getOverrides } from '../../utils-local/network'
import { AmountBN } from '../../models/AmountBN'
import { CustomNamedAllocation } from '../../models/CustomNamedAllocation'
import { parseCustomNamedAllocationsCSV } from '../../models/CustomNamedAllocation/parseCustomNamedAllocationsCSV'
import { VestingType } from '../../models/VestingType'
import { sendMultipleTransactions } from '../../utils-local/ethers'
import { RunnableContext } from '../../utils-local/context/getRunnableContext'
import { tenPow18 } from '../../libs/bn/constants'
import { sumAmountBNs } from '../../libs/ethereum/models/AmountBN/sumAmountBNs'
import { Filename } from '../../libs/utils/filesystem'

export const noVestingName = 'None'

export async function addAllocationsByVestingTypeIndex(token: GenericTokenWithVesting, vestingTypeIndex: number, allocations: Allocation[]) {
  const addresses = allocations.map(a => a.address)
  const allocationAmounts = allocations.map(a => a.amount).map(toAllocationAmount)
  const overrides = await getOverrides(token.signer)
  return token.addAllocations(addresses, allocationAmounts, vestingTypeIndex, overrides)
}

export async function addUnvestedAllocations(token: GenericTokenWithVesting, allocations: CustomNamedAllocation[]) {
  const addresses = allocations.map(a => a.address)
  const amounts = allocations.map(a => a.amount)
  const overrides = await getOverrides(token.signer)
  return token.transferMany(addresses, amounts, overrides)
}

export async function getAllocations(totalAmount: AmountBN, filename: Filename) {
  const allocations = await readAllocationsCSV(filename)
  return validateAllocations(totalAmount, allocations)
}

export async function readAllocationsCSV(filename: Filename) {
  const data = await readFile(filename)
  return parseCustomNamedAllocationsCSV(data)
}

export function splitAllocations(allocations: CustomNamedAllocation[]) {
  const vested = allocations.filter(a => a.vesting !== noVestingName)
  const unvested = allocations.filter(a => a.vesting === noVestingName)
  return { vested, unvested }
}

export async function addVestedAllocations(context: RunnableContext, token: GenericTokenWithVesting, vestingTypes: VestingType[], allocations: CustomNamedAllocation[]) {
  const vestingNames = uniq(allocations.map(a => a.vesting))
  return sendMultipleTransactions(context, vestingNames, async (vestingName) => {
    const allocationsByType = allocations.filter(a => a.vesting === vestingName)
    const vesting = ensure(vestingTypes.find(t => t.name === vestingName))
    return addAllocationsByVestingTypeIndex(token, vesting.smartContractIndex, allocationsByType)
  })
}

export function validateAllocations(totalAmount: AmountBN, allocations: CustomNamedAllocation[]) {
  const sum = sumAmountBNs(allocations)
  expect(sum).to.equal(totalAmount)
  return allocations
}

function toAllocationAmount(amount: AmountBN) {
  // NOTE: It's multiplied in the contract by 10 ** 18
  const allocationAmount = amount.div(tenPow18)
  expect(allocationAmount.mul(tenPow18)).to.equal(amount)
  return allocationAmount
}
