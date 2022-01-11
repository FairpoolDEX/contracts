import { z } from 'zod'
import { ContractTypeSchema } from './ContractType'

export const AddressTypeSchema = ContractTypeSchema.nullable()

export type AddressType = z.infer<typeof AddressTypeSchema>

export const Human: AddressType = null
