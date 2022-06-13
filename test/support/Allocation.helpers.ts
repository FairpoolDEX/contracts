import { GenericTokenWithVesting } from '../../typechain-types'
import { Allocation } from '../../models/Allocation'
import { sumAmountsOf } from '../../util/balance'
import { expect } from '../../util/expect'
import { readFile } from 'fs/promises'
import { uniq } from 'lodash'
import { ensure } from '../../util/ensure'
import { getOverrides } from '../../util/network'
import { AmountBN } from '../../models/AmountBN'
import { CustomNamedAllocation } from '../../models/CustomNamedAllocation'
import { Filename } from '../../util/filesystem'
import { parseCustomNamedAllocationsCSV } from '../../models/CustomNamedAllocation/parseCustomNamedAllocationsCSV'
import { VestingType } from '../../models/VestingType'
import { parMap } from '../../util/promise'
import { tenPower18 } from '../../util/bignumber'

export const noVestingName = 'None'

export async function addVestedAllocations(vestingTypeIndex: number, token: GenericTokenWithVesting, allocations: Allocation[]) {
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

export async function setAllocations(vestingTypes: VestingType[], token: GenericTokenWithVesting, allocations: CustomNamedAllocation[]) {
  const vestingNames = uniq(allocations.map(a => a.vesting))
  return parMap(vestingNames, async (vestingName) => {
    const allocationsByType = allocations.filter(a => a.vesting === vestingName)
    const vesting = ensure(vestingTypes.find(t => t.name === vestingName))
    return addVestedAllocations(vesting.smartContractIndex, token, allocationsByType)
  })
}

export function validateAllocations(totalAmount: AmountBN, allocations: CustomNamedAllocation[]) {
  const sum = sumAmountsOf(allocations)
  expect(sum).to.equal(totalAmount)
  return allocations
}

function toAllocationAmount(amount: AmountBN) {
  // NOTE: It's multiplied in the contract by 10 ** 18
  const allocationAmount = amount.div(tenPower18)
  expect(allocationAmount.mul(tenPower18)).to.equal(amount)
  return allocationAmount
}
