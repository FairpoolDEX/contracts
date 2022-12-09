import { expectEqualResults } from 'libs/utils/chai/expectEqualResults'

export abstract class GenericCommand<Model, Real, Result> {
  async run(model: Model, real: Real) {
    await this.expectEqualResults(this.runModel(model), this.runReal(real))
  }

  async expectEqualResults(modelTxPromise: Promise<Result>, realTxPromise: Promise<Result>) {
    return expectEqualResults('Model', 'Real')(modelTxPromise, realTxPromise)
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
