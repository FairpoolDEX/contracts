import { AsyncCommand } from 'fast-check'
import { Address } from '../../../../models/Address'
import { ERC20EnumerableCommand } from '../ERC20EnumerableCommand'
import { AmountBN } from '../../../../models/AmountBN'
import { findBalanceDefault, upsertBalance } from '../../../support/fast-check/models/ERC20Model'
import { $zero } from '../../../../data/allAddresses'
import { ERC20EnumerableModel } from '../ERC20EnumerableModel'
import { ERC20EnumerableReal } from '../ERC20EnumerableReal'
import { Ethers } from '../../../../utils-local/types'

export class MintCommand extends ERC20EnumerableCommand<boolean> implements AsyncCommand<ERC20EnumerableModel, ERC20EnumerableReal, true> {
  constructor(
    readonly ethers: Ethers,
    readonly to: Address,
    readonly amount: AmountBN,
  ) {
    super(ethers)
  }

  async check(model: ERC20EnumerableModel) {
    return true
  }

  async runModel(model: ERC20EnumerableModel) {
    if (this.to === $zero) throw new Error('ERC20: mint to the zero address')
    const balanceTo = findBalanceDefault(model, this.to)
    balanceTo.amount = balanceTo.amount.add(this.amount)
    upsertBalance(model, balanceTo)
    return true
  }

  async runReal(real: ERC20EnumerableReal) {
    throw new Error(`
      # Resolve the mint functionality
    
      Options:
      
      * Test the complete Fairpool contract
      * Test the GenericERC20Enumerable contract where anyone can mint
    `)
    // const tx = await real.connect(this.from).transfer(this.to, this.amount)
    return true
  }

}
