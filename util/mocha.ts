import { AsyncFunc, Test } from 'mocha'

export const testNameRegExp: RegExp | undefined = process.env.TEST_FILTER ? new RegExp(process.env.TEST_FILTER) : undefined

export function long(name: string, fn: AsyncFunc): Test {
  if (process.env.LONG_RUNNING_TESTS) {
    return test(name, fn)
  } else {
    return it.skip(name, fn)
  }
}

export function test(name: string, fn: AsyncFunc): Test {
  if (!testNameRegExp || name.match(testNameRegExp)) {
    return it(name, fn)
  } else {
    return it.skip(name, fn)
  }
}
