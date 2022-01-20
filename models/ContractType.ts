import { z } from 'zod'

export const ContractTypeSchema = z.enum([
  'Unknown',
  'NFTrade',
  'UniswapV2Pair',
  'UniswapV3Pair',
  'TeamFinance',
  'GnosisProxy',
  'FlashWallet_ZeroExProxy', // 0x proxy
])

export const { Unknown, NFTrade, UniswapV2Pair, UniswapV3Pair, TeamFinance } = ContractTypeSchema.enum

export type ContractType = z.infer<typeof ContractTypeSchema>
