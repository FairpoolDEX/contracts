import { z } from 'zod'

export const ContractNameSchema = z.enum(['ShieldToken', 'ColiToken', 'BullToken', 'GenericToken', 'MCP', 'Coliquidity'])

export type ContractName = z.infer<typeof ContractNameSchema>

export const ColiToken = ContractNameSchema.enum.ColiToken

export const BullToken = ContractNameSchema.enum.BullToken

export function validateContractName(type: ContractName) {
  return ContractNameSchema.parse(type)
}
