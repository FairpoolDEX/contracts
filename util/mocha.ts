import { AsyncFunc, Test } from 'mocha'

export const testFilterRegExp: RegExp | undefined = process.env.TEST_FILTER ? new RegExp(process.env.TEST_FILTER) : undefined

export function long(name: string, fn: AsyncFunc): Test {
  if (process.env.LONG_RUNNING_TESTS === 'true') {
    return fest(name, fn)
  } else {
    return it.skip(name, fn)
  }
}

export function fest(name: string, fn: AsyncFunc): Test {
  if (!testFilterRegExp || name.match(testFilterRegExp)) {
    return it(name, fn)
  } else {
    return it.skip(name, fn)
  }
}

fest.skip = it.skip
