import { strict as assert } from 'assert'
import { BlockchainModel } from '../models/BlockchainModel'
import { BlockchainReal } from '../models/BlockchainReal'
import { Address } from '../../../../models/Address'
import { GenericCommand } from './GenericCommand'
import { impl } from 'libs/utils/todo'

export abstract class BlockchainCommand<Model extends BlockchainModel, Real extends BlockchainReal, Result> extends GenericCommand<Model, Real, Result> {
  getModelContract(model: Model, tokenAddress: string) {
    const token = model.tokens.find(t => t.address === tokenAddress)
    assert(token)
    return token
  }

  getRealContract(real: Real, tokenAddress: string) {
    const token = real.tokens.find(t => t.address === tokenAddress)
    assert(token)
    return token
  }

  async getRealBalanceAmount(real: Real, tokenAddress: Address, userAddress: Address) {
    const token = this.getRealContract(real, tokenAddress)
    const amount = await token.balanceOf(userAddress)
    return amount.toNumber()
  }

  async getModelBalanceAmount(model: Model, tokenAddress: Address, userAddress: Address) {
    const token = this.getModelContract(model, tokenAddress)
    const balance = token.balances.find(b => b.address === userAddress)
    assert(balance)
    return balance.amount
  }

  async getRealOutgoingTransferAmountSum(real: Real, tokenAddress: Address, userAddresses: Address[]) {
    throw impl('Use events')
  }
}
