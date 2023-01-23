import { z } from 'zod'
import { getDuplicatesRefinement } from '../utils/zod'
import { NetworkNameSchema } from '../libs/ethereum/models/NetworkName'
import { AddressSchema } from './Address'

export const TokenInfoSchema = z.object({
  symbol: z.string().min(1),
  network: NetworkNameSchema,
  address: AddressSchema,
  multiplier: z.number().int().positive().default(1),
})

export const TokenInfosSchema = z.array(TokenInfoSchema)
  .superRefine(getDuplicatesRefinement('TokenInfo', parseTokenInfoUid))

export const TokenInfoUidSchema = TokenInfoSchema.pick({
  network: true,
  address: true,
})

export type TokenInfo = z.infer<typeof TokenInfoSchema>

export type TokenInfoUid = z.infer<typeof TokenInfoUidSchema>

export function parseTokenInfo(tokenInfo: TokenInfo): TokenInfo {
  return TokenInfoSchema.parse(tokenInfo)
}

export function parseTokenInfos(tokenInfos: TokenInfo[]): TokenInfo[] {
  return TokenInfosSchema.parse(tokenInfos)
}

export function parseTokenInfoUid(tokenInfoUid: TokenInfoUid): TokenInfoUid {
  return TokenInfoUidSchema.parse(tokenInfoUid)
}
