import { AsyncFunc, Context } from 'mocha'
import { safeParseJSON } from '../../libs/utils/JSON'

/**
 * TODO: does not work as intended, need to parse the JSON out of message
 */
export function withCleanEthersError(fn: AsyncFunc) {
  return async function (this: Context) {
    try {
      return fn.call(this)
    } catch (e) {
      if (e instanceof Error) {
        const result = safeParseJSON(e.message)
        if (result.success) {
          const { value } = result
          if (typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string') {
            throw new Error(value.message)
          }
        }
      }
      throw e
    }
  }
}
