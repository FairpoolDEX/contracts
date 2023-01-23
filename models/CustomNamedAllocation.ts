import { z } from 'zod'
import { getDuplicatesRefinement } from '../utils/zod'
import { AllocationSchema } from './Allocation'

export const CustomNamedAllocationSchema = AllocationSchema.extend({
  vesting: z.string().min(1),
}).describe('CustomNamedAllocation')

export const CustomNamedAllocationsSchema = z.array(CustomNamedAllocationSchema)
  .superRefine(getDuplicatesRefinement('CustomNamedAllocation', parseCustomNamedAllocationUid))

export const CustomNamedAllocationUidSchema = CustomNamedAllocationSchema.pick({
  address: true,
})

export type CustomNamedAllocation = z.infer<typeof CustomNamedAllocationSchema>

export type CustomNamedAllocationUid = z.infer<typeof CustomNamedAllocationUidSchema>

export function parseCustomNamedAllocation(allocation: CustomNamedAllocation): CustomNamedAllocation {
  return CustomNamedAllocationSchema.parse(allocation)
}

export function parseCustomNamedAllocations(allocations: CustomNamedAllocation[]): CustomNamedAllocation[] {
  return CustomNamedAllocationsSchema.parse(allocations)
}

export function parseCustomNamedAllocationUid(allocationUid: CustomNamedAllocationUid): CustomNamedAllocationUid {
  return CustomNamedAllocationUidSchema.parse(allocationUid)
}
