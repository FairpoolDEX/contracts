import { expect } from '../../../../util-local/expect'
import { ImplementationError } from '../../../../util/todo'

export abstract class GenericCommand<Model, Real, Result> {
  async run(model: Model, real: Real) {
    await this.expectEqualResults(this.runModel(model), this.runReal(real))
  }

  async expectEqualResults(modelTxPromise: Promise<Result>, realTxPromise: Promise<Result>) {
    const [modelResult, realResult] = await Promise.allSettled([modelTxPromise, realTxPromise])
    try {
      expect(modelResult.status).to.equal(realResult.status)
      if (modelResult.status === 'fulfilled' && realResult.status === 'fulfilled') {
        expect(modelResult.value).to.deep.equal(realResult.value)
      } else if (modelResult.status === 'rejected' && realResult.status === 'rejected') {
        expect(modelResult.reason.toString()).to.equal(realResult.reason.toString())
        if (modelResult.reason instanceof ImplementationError || realResult.reason instanceof ImplementationError) {
          throw new Error('Unexpected ImplementationError')
        }
      }
    } catch (e) {
      console.log('e', e)
      if (e instanceof Error) {
        if (modelResult.status === 'rejected') e.message += '\n\nModel ' + modelResult.reason.stack
        if (realResult.status === 'rejected') e.message += '\n\nReal ' + realResult.reason.stack
      }
      throw e
    }
  }

  abstract check(model: Readonly<Model>): Promise<boolean>

  abstract runModel(model: Model): Promise<Result>

  abstract runReal(real: Real): Promise<Result>

  toString(): string {
    return `${this.constructor.name} ${(JSON.stringify(this, this.replacerForObject, 2))}`
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter
   */
  replacerForObject(key: string, value: unknown) {
    if (key === '') return value // value is current object
    return this.replacerForProperty(key, value)
  }

  replacerForProperty(key: string, value: unknown) {
    return value
  }
}
