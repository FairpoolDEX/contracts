import { expect } from '../../../../util-local/expect'
import { ImplementationError } from '../../../../util/todo'

export abstract class GenericCommand<Model, Real, Result> {
  toString(): string {
    return `${this.constructor.name} ${JSON.stringify(this, undefined, 2)}`
  }

  async run(model: Model, real: Real) {
    await this.expectMatch(this.runModel(model), this.runReal(real))
  }

  abstract runModel(model: Model): Promise<Result>

  abstract runReal(real: Real): Promise<Result>

  async expectMatch(modelTxPromise: Promise<Result>, realTxPromise: Promise<Result>) {
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
      if (e instanceof Error) {
        if (modelResult.status === 'rejected') e.message += '\n\nModel ' + modelResult.reason.stack
        if (realResult.status === 'rejected') e.message += '\n\nReal ' + realResult.reason.stack
      }
      throw e
    }
  }

}
