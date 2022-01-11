import { z } from 'zod'

export const ContractTypeSchema = z.enum([
  'NFTrade',
  'UniswapV2',
  'UniswapV3',
  'TeamFinance',
])

export const { NFTrade, UniswapV2, UniswapV3, TeamFinance } = ContractTypeSchema.enum

export type ContractType = z.infer<typeof ContractTypeSchema>
