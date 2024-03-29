import cacheManager from 'cache-manager'
import fsStore from 'cache-manager-fs-hash'
import { days, seconds } from '../utils-local/time'
import { toString } from 'lodash'
import { homedir } from 'os'
import mkdirp from 'mkdirp'
import { z } from 'zod'

export const CacheKeySchema = z.string()

export type CacheKey = z.infer<typeof CacheKeySchema>

/**
 * Copied because it's not exported
 */
interface FsHashStoreOptions {
  path?: string | undefined;
  ttl?: number | undefined;
  maxsize?: number | undefined;
  subdirs?: boolean | undefined;
  zip?: boolean | undefined;
}

export function createFsCache($options: FsHashStoreOptions = {}) {
  const options = {
    path: getFsCachePathForContracts(), // path for cached files
    ttl: 7 * days / seconds, // time to life in seconds
    subdirs: true, // create subdirectories to reduce the count of files in a single dir (default: false)
    ...$options,
  }
  mkdirp.sync(options.path)
  return cacheManager.caching({
    store: fsStore,
    options,
  })

}

export function getDefaultFsCachePath() {
  return process.env.CACHE_DIR ?? `${homedir()}/.cache`
}

export function getFsCachePathForContracts(suffix = '') {
  return getDefaultFsCachePath() + '/shield-contracts' + suffix
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getCacheKey(func: Function, ...args: unknown[]) {
  return JSON.stringify([func.name, ...args.map(toString)])
}
