import { AsyncFunc, Test } from 'mocha'

export const testFilterRegExp: RegExp | undefined = process.env.FILTER ? new RegExp(process.env.FILTER) : undefined

export function long(name: string, fn: AsyncFunc): Test {
  if (process.env.LONG === 'true') {
    return fest(name, fn)
  } else {
    return it.skip(name, fn)
  }
}

export function fest(name: string, fn: AsyncFunc): Test {
  if (testFilterRegExp) {
    if (name.match(testFilterRegExp)) {
      return it.only(name, fn)
    } else {
      return it.skip(name, fn)
    }
  } else {
    return it(name, fn)
  }
}

fest.skip = it.skip

export const festF = (fn: AsyncFunc) => fest(fn.name, fn)

festF.skip = (fn: AsyncFunc) => fest.skip(fn.name, fn)
