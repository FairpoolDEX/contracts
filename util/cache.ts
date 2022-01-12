import cacheManager from 'cache-manager'
import fsStore from 'cache-manager-fs-hash'
import { days, seconds } from './time'
import { toString } from 'lodash'

export type CacheKey = string

export const cache = cacheManager.caching({
  store: fsStore,
  options: {
    path: '/tmp/contracts-cache', // path for cached files
    ttl: 7 * days / seconds, // time to life in seconds
    subdirs: true, // create subdirectories to reduce the count of files in a single dir (default: false)
  },
})

export function getCacheKey(functionName: string, functionArgs: unknown[]) {
  return JSON.stringify([functionName, ...functionArgs.map(toString)])
}
