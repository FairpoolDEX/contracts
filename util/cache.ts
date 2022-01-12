import cacheManager from 'cache-manager'
import fsStore from 'cache-manager-fs-hash'
import { days, seconds } from './time'
import { toString } from 'lodash'

export type CacheKey = string

export const cache = cacheManager.caching({
  store: fsStore,
  options: {
    path: process.env.CACHE_DIR ?? '/tmp/contracts-cache', // path for cached files
    ttl: 7 * days / seconds, // time to life in seconds
    subdirs: true, // create subdirectories to reduce the count of files in a single dir (default: false)
  },
})

// eslint-disable-next-line @typescript-eslint/ban-types
export function getCacheKey(func: Function, ...args: unknown[]) {
  return JSON.stringify([func, ...args.map(toString)])
}
