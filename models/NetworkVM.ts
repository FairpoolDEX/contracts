import { z } from 'zod'

export const NetworkVMTypeSchema = z.enum(['EVM', 'SolVM'])

export type NetworkVM = z.infer<typeof NetworkVMTypeSchema>
