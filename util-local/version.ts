import pkg from '../package.json'
import { gt, gte, parse, SemVer } from 'semver'
import { ensure } from '../util/ensure'

export type Version = string

export type VersionedValue<Val> = [Version, Val]

export const VERSION: SemVer = ensure(parse(pkg.version), async () => new Error(`Invalid version "${pkg.version}" in package.json`))

export let TARGET: SemVer | null = null

function updateTarget(version: Version) {
  if (!TARGET || gt(version, TARGET)) {
    TARGET = parse(version)
  }
}

export function mergeVersionedRecords<Smth>(values: VersionedValue<Record<string, Smth>>[]): Record<string, Smth> {
  return values.reduce<Record<string, Smth>>(function (acc, [version, value]) {
    updateTarget(version)
    if (gte(VERSION, version)) {
      return { ...acc, ...value }
    } else {
      return acc
    }
  }, {})
}
