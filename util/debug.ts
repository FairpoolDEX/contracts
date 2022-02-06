import $debug from 'debug'
import { realname } from './filesystem'

export function getDebug(filename: string) {
  return $debug('app').extend(realname(filename))
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function debug(filename: string, func: Function, ...args: [unknown, ...unknown[]]) {
  const d = getDebug(filename).extend(func.name)
  return d.apply(d, args)
}
