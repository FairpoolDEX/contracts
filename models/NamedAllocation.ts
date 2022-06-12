import { z } from 'zod'
import { toUidFromSchema, Uid } from './Uid'
import { VestingNameSchema } from './VestingName'
import { getFinishedVestingTypes } from '../data/allVestingSchedules'
import { AllocationSchema } from './Allocation'

export const NamedAllocationSchema = AllocationSchema.extend({
  type: VestingNameSchema,
})

export const NamedAllocationUidSchema = NamedAllocationSchema.pick({
  address: true,
  vestingType: true,
})

export type NamedAllocation = z.infer<typeof NamedAllocationSchema>

export type NamedAllocationUid = z.infer<typeof NamedAllocationUidSchema>

export function validateNamedAllocation(allocation: NamedAllocation): NamedAllocation {
  return NamedAllocationSchema.parse(allocation)
}

export function getNamedAllocationUid(allocationUid: NamedAllocationUid): Uid {
  return toUidFromSchema(allocationUid, NamedAllocationUidSchema)
}

export function isFinished(allocation: NamedAllocation) {
  return getFinishedVestingTypes().includes(allocation.type)
}
