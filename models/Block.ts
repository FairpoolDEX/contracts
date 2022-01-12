import { z } from 'zod'
import { BlockNumberSchema } from './BlockNumber'

export const BlockSchema = z.object({
  number: BlockNumberSchema,
  timestamp: z.date(),
})

export type Block = z.infer<typeof BlockSchema>

export function validateBlock(block: Block) {
  return BlockSchema.parse(block)
}

export function getBlockUid(block: Pick<Block, 'number'>): string {
  return block.number.toString()
}
