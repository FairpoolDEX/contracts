import { GenericCommand } from '../../support/fast-check/commands/GenericCommand'
import { ERC20EnumerableModel } from './ERC20EnumerableModel'
import { ERC20EnumerableReal } from './ERC20EnumerableReal'

export abstract class ERC20EnumerableCommand<Result> extends GenericCommand<ERC20EnumerableModel, ERC20EnumerableReal, Result> {
  protected constructor() {
    super()
  }
}
