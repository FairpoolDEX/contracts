import { z } from 'zod'
import { getDuplicatesRefinement } from '../utils/zod'
import { AddressSchema } from './Address'
import { AmountBNSchema } from './AmountBN'

export const AllocationSchema = z.object({
  address: AddressSchema,
  amount: AmountBNSchema,
}).describe('Allocation')

export const AllocationsSchema = z.array(AllocationSchema)
  .superRefine(getDuplicatesRefinement('Allocation', parseAllocationUid))

export const AllocationUidSchema = AllocationSchema.pick({
  address: true,
})

export type Allocation = z.infer<typeof AllocationSchema>

export type AllocationUid = z.infer<typeof AllocationUidSchema>

export function parseAllocation(allocation: Allocation): Allocation {
  return AllocationSchema.parse(allocation)
}

export function parseAllocations(allocations: Allocation[]): Allocation[] {
  return AllocationsSchema.parse(allocations)
}

export function parseAllocationUid(allocationUid: AllocationUid): AllocationUid {
  return AllocationUidSchema.parse(allocationUid)
}
