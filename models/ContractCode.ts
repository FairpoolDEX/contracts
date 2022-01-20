import { z } from 'zod'

export const ContractCodeSchema = z.string().min(1).refine(s => s.startsWith('0x'))

export const ContractCodeUidSchema = ContractCodeSchema

export type ContractCode = z.infer<typeof ContractCodeSchema>

export type ContractCodeUid = z.infer<typeof ContractCodeUidSchema>

export function validateContractCode(code: ContractCode): ContractCode {
  return ContractCodeSchema.parse(code)
}
