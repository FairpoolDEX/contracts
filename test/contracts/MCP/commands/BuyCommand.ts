import fc from "fast-check"
import { Address, Amount, Price, Timestamp } from "../../../../util/types"
import { MCPBlockchainModel } from "../MCPBlockchainModel"
import { MCPBlockchainReal } from "../MCPBlockchainReal"
import { dateToTimestampSeconds } from "hardhat/internal/util/date"
import { MCPCommand } from "../MCPCommand"
import { expect } from "../../../../util/expect"

export class BuyCommand extends MCPCommand implements fc.AsyncCommand<MCPBlockchainModel, MCPBlockchainReal> {
  constructor(readonly buyer: Address, readonly seller: Address, readonly guaranteedAmount: Amount, readonly guaranteedPrice: Price, readonly expirationDate: Date, readonly protectionPrice: Price) {
    super()
  }

  check(model: Readonly<MCPBlockchainModel>) {
    return true
  }

  async run(model: MCPBlockchainModel, real: MCPBlockchainReal) {
    // await this.expectTxes(
      // model.buy(this.buyer, this.seller, this.guaranteedAmount, this.guaranteedPrice, this.expirationDate, this.protectionPrice),
      // real.mcp.attach(this.buyer).buy(this.seller, this.guaranteedAmount, this.guaranteedPrice, dateToTimestampSeconds(this.expirationDate), this.protectionPrice),
    // )
    expect(model.mcp.protections.length).to.equal(await real.mcp.protectionsLength())
  }

  toString(): string {
    return `Buy ${this.buyer} ${this.seller} ${this.guaranteedAmount} ${this.guaranteedPrice} ${this.expirationDate} ${this.protectionPrice}`
  }
}
