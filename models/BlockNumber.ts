import { z } from 'zod'

export const BlockNumberSchema = z.number()

export type BlockNumber = z.infer<typeof BlockNumberSchema>

export function validateBlockNumber(number: BlockNumber) {
  return BlockNumberSchema.parse(number)
}

export function getBlockNumberUid(number: BlockNumber): string {
  return number.toString()
}
