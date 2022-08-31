import { AsyncCommand } from 'fast-check'
import { Address } from '../../../../models/Address'
import { GenericCommand } from '../../../support/fast-check/commands/GenericCommand'
import { Logger } from '../../../../util-local/log'

interface DummyModel {}
interface DummyReal {}

export class DummyCommand extends GenericCommand<DummyModel, DummyReal, boolean> implements AsyncCommand<DummyModel, DummyReal, true> {
  constructor(
    readonly address: Address,
    readonly logger: Logger
  ) {
    super()
  }

  async check(model: DummyModel) {
    this.logger(this.toString(), 'check')
    return true
  }

  async runModel(model: DummyModel) {
    this.logger(this.toString(), 'runModel')
    return true
  }

  async runReal(real: DummyReal) {
    this.logger(this.toString(), 'runReal')
    return true
  }

}
