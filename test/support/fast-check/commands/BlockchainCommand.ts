import { expect } from "../../../../util/expect"
import { Address } from "../../../../util/types"
import { strict as assert } from "assert"
import { BlockchainModel } from "../models/BlockchainModel"
import { BlockchainReal } from "../models/BlockchainReal"
import { ImplementationError, task } from "../../../../util/task"

export abstract class BlockchainCommand<Model extends BlockchainModel, Real extends BlockchainReal, Result> {
  toString(): string {
    return `${this.constructor.name} ${JSON.stringify(this, undefined, 2)}`
  }

  async run(model: Model, real: Real) {
    await this.expectMatch(this.runModel(model), this.runReal(real))
  }

  abstract runModel(model: Model): Promise<Result>

  abstract runReal(real: Real): Promise<Result>

  async expectMatch(modelTxPromise: Promise<Result>, realTxPromise: Promise<Result>) {
    const [modelResult, realResult] = await Promise.allSettled([modelTxPromise, realTxPromise])
    try {
      expect(modelResult.status).to.equal(realResult.status)
      if (modelResult.status === "fulfilled" && realResult.status === "fulfilled") {
        expect(modelResult.value).to.deep.equal(realResult.value)
      } else if (modelResult.status === "rejected" && realResult.status === "rejected") {
        expect(modelResult.reason.toString()).to.equal(realResult.reason.toString())
        if (modelResult.reason instanceof ImplementationError || realResult.reason instanceof ImplementationError) {
          throw new Error('Unexpected ImplementationError')
        }
      }
    } catch (e) {
      if (modelResult.status === "rejected") e.message += "\n\nModel " + modelResult.reason.stack
      if (realResult.status === "rejected") e.message += "\n\nReal " + realResult.reason.stack
      throw e
    }
  }

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
    throw task("Use events")
  }
}
