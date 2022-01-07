import { z } from 'zod'

export const AddressTypeSchema = z.enum([
  'Human',
  'NFTrade',
  'UniswapV2',
  'UniswapV3',
  'TeamFinance',
])

export const { Human, NFTrade, UniswapV2, UniswapV3, TeamFinance } = AddressTypeSchema.enum

export type AddressType = z.infer<typeof AddressTypeSchema>
