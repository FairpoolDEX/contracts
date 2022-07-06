import { z } from 'zod'

export const RunnableTaskArgumentsSchema = z.object({
})

export type RunnableTaskArguments = z.infer<typeof RunnableTaskArgumentsSchema>

export function validateRunnableTaskArguments(args: RunnableTaskArguments): RunnableTaskArguments {
  return RunnableTaskArgumentsSchema.parse(args)
}
