import { CacheKey } from './cache'

export interface RunnableTaskArguments {
  cacheKey: CacheKey
  dry: boolean
}
