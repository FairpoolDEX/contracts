import { Cache } from 'cache-manager'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { z } from 'zod'
import { CacheKeySchema, createFsCache, getFsCachePathForContracts } from '../cache'
import { RunnableContext } from './getRunnableContext'
import { days, seconds } from '../time'

export interface CachedContext {
  cache: Cache
}

export interface CachedRunnableContext extends CachedContext, RunnableContext {}

export const CachedTaskArgumentsSchema = z.object({
  cacheKey: CacheKeySchema,
  cacheTtl: z.number().min(1).default(7 * days / seconds), // in seconds
})

export type CachedTaskArguments = z.infer<typeof CachedTaskArgumentsSchema>

export function validateCachedTaskArguments(args: CachedTaskArguments): CachedTaskArguments {
  return CachedTaskArgumentsSchema.parse(args)
}

export async function getCachedContext($args: CachedTaskArguments, hre: HardhatRuntimeEnvironment): Promise<CachedContext> {
  const args = validateCachedTaskArguments($args)
  const cache = createFsCache({
    path: getFsCachePathForContracts(`/${args.cacheKey}`),
    ttl: args.cacheTtl,
  })
  return {
    cache,
  }
}
