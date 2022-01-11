import { z } from 'zod'

export const BlockSchema = z.object({
  number: z.number(),
  timestamp: z.date(),
})

export type Block = z.infer<typeof BlockSchema>

export function validateBlock(block: Block) {
  return BlockSchema.parse(block)
}

export function getBlockUid(block: Pick<Block, 'number'>): string {
  return block.number.toString()
}
