import { ContractTransaction } from "@ethersproject/contracts"
import { expect } from "../../../util/expect"
import { Address } from "../../../util/types"
import { strict as assert } from "assert"
import { TokenModel } from "./TokenModel"

export abstract class BlockchainCommand {
  toString(): string {
    return `${this.constructor.name} ${JSON.stringify(this, undefined, 2)}`
  }

  async expectTxes<N, M>(modelTxPromise: Promise<N>, realTxPromise: Promise<M>) {
    const [modelResult, realResult] = await Promise.allSettled([modelTxPromise, realTxPromise])
    try {
      expect(modelResult.status).to.equal(realResult.status)
      if (modelResult.status === "fulfilled" && realResult.status === "fulfilled") {
        expect(modelResult.value).to.equal(realResult.value)
      } else if (modelResult.status === "rejected" && realResult.status === "rejected") {
        expect(modelResult.reason).to.equal(realResult.reason)
      }
    } catch (e) {
      console.error("modelResult", modelResult)
      console.error("realResult", realResult)
      throw e
    }
  }

  async getBalanceAmount(ownerAddress: Address, tokenAddress: Address, model: { tokens: TokenModel[] }) {
    const token = model.tokens.find(t => t.address === tokenAddress)
    assert(token)
    const balance = token.balances.find(b => b.owner === ownerAddress)
    assert(balance)
    return balance.amount
  }

}
