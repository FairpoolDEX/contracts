import { z } from 'zod'

export const VestingTypeSchema = z.enum([
  'Seed',
  'Private',
  'Public',
  'Advisory',
  'Team',
  'Development',
  'Marketing',
  'General Reserve',
  'Liquidity provisioning',
  'Liquidity mining',
  'Rewards',
])

export type VestingType = z.infer<typeof VestingTypeSchema>

export function validateVestingType(type: VestingType | string) {
  return VestingTypeSchema.parse(type)
}
