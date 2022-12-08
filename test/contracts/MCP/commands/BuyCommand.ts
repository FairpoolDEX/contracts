import fc from 'fast-check'
import { MCPCommand } from '../MCPCommand'
import { expect } from '../../../../util-local/expect'
import { MCPModel, MCPReal } from '../MCPBlockchainModel'
import { Address } from '../../../../models/Address'
import { AmountBN, PriceBN } from '../../../../models/AmountBN'

export abstract class BuyCommand extends MCPCommand<unknown> implements fc.AsyncCommand<MCPModel, MCPReal, true> {
  protected constructor(readonly buyer: Address, readonly seller: Address, readonly guaranteedAmount: AmountBN, readonly guaranteedPrice: PriceBN, readonly expirationDate: Date, readonly protectionPrice: PriceBN) {
    super()
  }

  async check(model: Readonly<MCPModel>) {
    return true
  }

  async run(model: MCPModel, real: MCPReal) {
    // await this.expectTxes(
    // model.buy(this.buyer, this.seller, this.guaranteedAmount, this.guaranteedPrice, this.expirationDate, this.protectionPrice),
    // real.mcp.attach(this.buyer).buy(this.seller, this.guaranteedAmount, this.guaranteedPrice, dateToTimestampSeconds(this.expirationDate), this.protectionPrice),
    // )
    expect(model.protections.length).to.equal(await real.mcp.protectionsLength())
  }

  toString(): string {
    return `Buy ${this.buyer} ${this.seller} ${this.guaranteedAmount} ${this.guaranteedPrice} ${this.expirationDate} ${this.protectionPrice}`
  }
}
