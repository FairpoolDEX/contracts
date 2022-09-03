import { ImplementationError } from './todo'
import { expect } from '../util-local/expect'

export const expectEqualResults = (actualName = 'Actual', expectedName = 'Expected') => async <Result>(actual: Promise<Result>, expected: Promise<Result>) => {
  const [actualResult, expectedResult] = await Promise.allSettled([actual, expected])
  try {
    expect(actualResult.status).to.equal(expectedResult.status)
    if (actualResult.status === 'fulfilled' && expectedResult.status === 'fulfilled') {
      expect(actualResult.value).to.deep.equal(expectedResult.value)
      return actualResult.value
    } else if (actualResult.status === 'rejected' && expectedResult.status === 'rejected') {
      expect(actualResult.reason.toString()).to.equal(expectedResult.reason.toString())
      if (actualResult.reason instanceof ImplementationError || expectedResult.reason instanceof ImplementationError) {
        throw new Error('Unexpected ImplementationError')
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      if (actualResult.status === 'rejected') e.message += `\n\n${actual} ` + actualResult.reason.stack
      if (expectedResult.status === 'rejected') e.message += `\n\n${expected} ` + expectedResult.reason.stack
    }
    throw e
  }
}
