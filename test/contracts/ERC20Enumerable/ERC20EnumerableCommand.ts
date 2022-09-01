import { GenericCommand } from '../../support/fast-check/commands/GenericCommand'
import { ERC20EnumerableModel } from './ERC20EnumerableModel'
import { ERC20EnumerableReal } from './ERC20EnumerableReal'
import { Ethers } from '../../../util-local/types'
import { ERC20 } from '../../../typechain-types'

export abstract class ERC20EnumerableCommand<Result> extends GenericCommand<ERC20EnumerableModel, ERC20EnumerableReal, Result> {
  protected constructor(
    readonly ethers: Ethers
  ) {
    super()
  }

  async connect(token: ERC20, address: string) {
    const signer = await this.ethers.getSigner(address)
    return token.connect(signer)
  }

  replacerForProperty(key: string, value: unknown) {
    if (key === 'ethers') return undefined
    return super.replacerForProperty(key, value)
  }
}
