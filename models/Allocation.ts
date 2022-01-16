import { z } from 'zod'
import { toUidFromSchema, Uid } from './Uid'
import { AddressSchema } from './Address'
import { AmountBNSchema } from './AmountBN'
import { VestingTypeSchema } from './VestingType'
import { getFinishedVestingTypes } from '../data/allVestingSchedules'

export const AllocationSchema = z.object({
  address: AddressSchema,
  amount: AmountBNSchema,
  type: VestingTypeSchema,
})

export const AllocationUidSchema = AllocationSchema.pick({
  address: true,
  vestingType: true,
})

export type Allocation = z.infer<typeof AllocationSchema>

export type AllocationUid = z.infer<typeof AllocationUidSchema>

export function validateAllocation(allocation: Allocation) {
  return AllocationSchema.parse(allocation)
}

export function getAllocationUid(allocationUid: AllocationUid): Uid {
  return toUidFromSchema(allocationUid, AllocationUidSchema)
}

export function isFinished(allocation: Allocation) {
  return getFinishedVestingTypes().includes(allocation.type)
}
