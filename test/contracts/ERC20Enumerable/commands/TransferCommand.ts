import { AsyncCommand } from 'fast-check'
import { Address } from '../../../../models/Address'
import { ERC20EnumerableCommand } from '../ERC20EnumerableCommand'
import { AmountBN } from '../../../../models/AmountBN'
import { findBalance, findBalanceDefault, getHolders as getHoldersERC20Model, upsertBalance } from '../../../support/fast-check/models/ERC20Model'
import { $zero } from '../../../../data/allAddresses'
import { BalanceBN } from '../../../../models/BalanceBN'
import { ERC20EnumerableModel } from '../ERC20EnumerableModel'
import { ERC20EnumerableReal, getBalances, getHolders } from '../ERC20EnumerableReal'
import { Ethers } from '../../../../utils-local/types'
import { sortBy } from 'lodash'

export class TransferCommand extends ERC20EnumerableCommand<TransferCommandResult> implements AsyncCommand<ERC20EnumerableModel, ERC20EnumerableReal, true> {
  constructor(
    readonly from: Address,
    readonly to: Address,
    readonly amount: AmountBN,
    ethers: Ethers
  ) {
    super(ethers)
  }

  async check(model: ERC20EnumerableModel) {
  //   const result = await this.do_check(model)
  //   return result
  // }
  //
  // async do_check(model: ERC20EnumerableModel) {
    const balanceFrom = findBalance(model, this.from)
    if (!balanceFrom) return false
    if (!balanceFrom.amount.gte(this.amount)) return false
    return true
  }

  async runModel(model: ERC20EnumerableModel) {
    if (this.from === $zero) throw new Error('ERC20: transfer from the zero address')
    if (this.to === $zero) throw new Error('ERC20: transfer to the zero address')
    const balanceFrom = findBalanceDefault(model, this.from)
    const balanceTo = findBalanceDefault(model, this.to)
    if (!balanceFrom.amount.gte(this.amount)) throw new Error('ERC20: transfer amount exceeds balance')
    balanceFrom.amount = balanceFrom.amount.sub(this.amount)
    balanceTo.amount = balanceTo.amount.add(this.amount)
    upsertBalance(model, balanceFrom)
    upsertBalance(model, balanceTo)
    return this.normalize({
      balances: model.balances,
      holders: getHoldersERC20Model(model),
    })
  }

  async runReal(real: ERC20EnumerableReal) {
    const token = await this.connect(real, this.from)
    const tx = await token.transfer(this.to, this.amount)
    const holders = await getHolders(real)
    const balances = await getBalances(real, holders)
    return this.normalize({
      balances,
      holders,
    })
  }

  normalize(result: TransferCommandResult) {
    return {
      ...result,
      balances: sortBy(result.balances, b => b.address),
      holders: sortBy(result.holders),
    }
  }
}

interface TransferCommandResult {
  balances: BalanceBN[]
  holders: Address[]
}
