import { z } from 'zod'

export const VestingNameSchema = z.enum([
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

export type VestingName = z.infer<typeof VestingNameSchema>

export function validateVestingName(name: VestingName | string) {
  return VestingNameSchema.parse(name)
}
