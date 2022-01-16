import { z } from 'zod'
import { BigNumber } from 'ethers'

export const SmartContractPercentageMultiplier = 10000

export const SmartContractPercentageSchema = z.instanceof(BigNumber).refine(n => n.gte(1) && n.lte(100 * SmartContractPercentageMultiplier))

export type SmartContractPercentage = z.infer<typeof SmartContractPercentageSchema>

export function validateSmartContractPercentage(percentage: SmartContractPercentage) {
  return SmartContractPercentageSchema.parse(percentage)
}

export const HundredPercent = validateSmartContractPercentage(BigNumber.from(100 * SmartContractPercentageMultiplier))
