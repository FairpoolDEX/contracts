import { GenericTokenWithVesting } from '../../typechain-types'
import { Allocation } from '../../models/Allocation'

export async function addAllocations(token: GenericTokenWithVesting, vestingTypeIndex: number, allocations: Allocation[]) {
  const addresses = allocations.map(a => a.address)
  const amounts = allocations.map(a => a.amount)
  await token.addAllocations(addresses, amounts, vestingTypeIndex)
}
