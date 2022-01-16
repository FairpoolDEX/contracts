import { z } from 'zod'
import { toUidFromSchema, Uid } from './Uid'
import { VestingTypeSchema } from './VestingType'
import { SmartContractPercentageSchema } from './SmartContractPercentage'

export const VestingScheduleSchema = z.object({
  type: VestingTypeSchema,
  smartContractIndex: z.number().optional(),
  initialUnlock: SmartContractPercentageSchema.optional(),
})

export const VestingScheduleUidSchema = VestingScheduleSchema.pick({
  type: true,
})

export type VestingSchedule = z.infer<typeof VestingScheduleSchema>

export type VestingScheduleUid = z.infer<typeof VestingScheduleUidSchema>

export function validateVestingSchedule(schedule: VestingSchedule) {
  return VestingScheduleSchema.parse(schedule)
}

export function getVestingScheduleUid(scheduleUid: VestingScheduleUid): Uid {
  return toUidFromSchema(scheduleUid, VestingScheduleUidSchema)
}
