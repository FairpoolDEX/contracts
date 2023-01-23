import { z } from 'zod'
import { getDuplicatesRefinement } from '../../utils/zod'
import { isEqualBy } from '../../utils/lodash'
import { AmountBNSchema } from '../AmountBN'
import { AddressSchema } from '../Address'

export const PositionSchema = z.object({
  offerIndex: AmountBNSchema,
  maker: AddressSchema,
  taker: AddressSchema,
  makerToken: AddressSchema,
  takerToken: AddressSchema,
  liquidityAmount: AmountBNSchema,
  makerAmount: AmountBNSchema,
  takerAmount: AmountBNSchema,
  lockedUntil: AmountBNSchema,
}).describe('Position')

export const PositionsSchema = z.array(PositionSchema)
  .superRefine(getDuplicatesRefinement('Position', parsePositionUid))

export const PositionUidSchema = PositionSchema.pick({})

export type Position = z.infer<typeof PositionSchema>

export type PositionUid = z.infer<typeof PositionUidSchema>

export function parsePositionFromContract(position: Position) {
  return parsePosition({ ...position })
}

export function parsePosition(position: Position): Position {
  return PositionSchema.parse(position)
}

export function parsePositions(positions: Position[]): Position[] {
  return PositionsSchema.parse(positions)
}

export function parsePositionUid(positionUid: PositionUid): PositionUid {
  return PositionUidSchema.parse(positionUid)
}

export const isEqualPosition = (a: Position) => (b: Position) => isEqualBy(a, b, parsePositionUid)
