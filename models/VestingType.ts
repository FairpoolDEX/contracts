import { z } from 'zod'
import { getDuplicatesRefinement } from '../util/zod'
import { ShareSchema } from './Share'
import { DurationSchema } from './Duration'

export const VestingTypeSchema = z.object({
  name: z.string().min(1),
  dailyShare: ShareSchema,
  monthlyShare: ShareSchema,
  initialShare: ShareSchema,
  cliff: DurationSchema,
  notes: z.string().optional(),
}).describe('VestingType')

export const VestingTypesSchema = z.array(VestingTypeSchema)
  .superRefine(getDuplicatesRefinement('VestingType', parseVestingTypeUid))

export const VestingTypeUidSchema = VestingTypeSchema.pick({
  name: true,
})

export type VestingType = z.infer<typeof VestingTypeSchema>

export type VestingTypeUid = z.infer<typeof VestingTypeUidSchema>

export function parseVestingType(type: VestingType): VestingType {
  return VestingTypeSchema.parse(type)
}

export function parseVestingTypes(types: VestingType[]): VestingType[] {
  return VestingTypesSchema.parse(types)
}

export function parseVestingTypeUid(typeUid: VestingTypeUid): VestingTypeUid {
  return VestingTypeUidSchema.parse(typeUid)
}
