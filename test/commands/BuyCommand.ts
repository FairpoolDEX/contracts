import { InternalCommand } from '../../libs/utils/fast-check/commands/InternalCommand'
import { todo } from '../../libs/utils/todo'
import { Address, buy } from '../../libs/fairpool/formulas/uni'
import { Model, Real } from './index'
import { Amount } from '../../libs/fairpool/formulas/models/Amount'

export class BuyCommand extends InternalCommand<Model, Real> {
  constructor(public contract: Address, public sender: Address, public quoteDeltaProposed: Amount) { super() }

  async check(model: Readonly<Model>) {
    return todo<boolean>()
  }

  async runModel(model: Model) {
    return buy(this.contract, this.sender, this.quoteDeltaProposed)(model)
  }

  async runReal(real: Real) {
    return todo<Model>()
  }
}
