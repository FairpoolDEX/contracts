import { z } from 'zod'
import { CacheKeySchema } from './cache'

export const RunnableTaskArgumentsSchema = z.object({
  cacheKey: CacheKeySchema,
  dry: z.boolean(),
})

export type RunnableTaskArguments = z.infer<typeof RunnableTaskArgumentsSchema>

export function validateRunnableTaskArguments(args: RunnableTaskArguments): RunnableTaskArguments {
  return RunnableTaskArgumentsSchema.parse(args)
}
