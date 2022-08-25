import { z } from 'zod'
import { getDuplicatesRefinement } from '../util/zod'
import { isEqualBy } from '../util/lodash'

export const ERC721TokenIdSchema = z.number().int().nonnegative().describe('ERC721TokenId')

export const ERC721TokenIdsSchema = z.array(ERC721TokenIdSchema)
  .superRefine(getDuplicatesRefinement('ERC721TokenId', parseERC721TokenIdUid))

export const ERC721TokenIdUidSchema = ERC721TokenIdSchema

export type ERC721TokenId = z.infer<typeof ERC721TokenIdSchema>

export type ERC721TokenIdUid = z.infer<typeof ERC721TokenIdUidSchema>

export function parseERC721TokenId(tokenId: ERC721TokenId): ERC721TokenId {
  return ERC721TokenIdSchema.parse(tokenId)
}

export function parseERC721TokenIds(tokenIds: ERC721TokenId[]): ERC721TokenId[] {
  return ERC721TokenIdsSchema.parse(tokenIds)
}

export function parseERC721TokenIdUid(tokenIdUid: ERC721TokenIdUid): ERC721TokenIdUid {
  return ERC721TokenIdUidSchema.parse(tokenIdUid)
}

export const isEqualERC721TokenId = (a: ERC721TokenId) => (b: ERC721TokenId) => isEqualBy(a, b, parseERC721TokenIdUid)
