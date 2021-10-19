import { Address, Amount, Price, Timestamp } from "../../../../util/types"
import { dateToTimestampSeconds } from "hardhat/internal/util/date"
import { ColiquidityBlockchainModel, ColiquidityBlockchainReal, ColiquidityCommand } from "../ColiquidityCommand"
import { expect } from "../../../../util/expect"
import { AsyncCommand } from "fast-check"

export class CreateOfferCommand extends ColiquidityCommand implements AsyncCommand<ColiquidityBlockchainModel, ColiquidityBlockchainReal, true> {
  constructor(
    readonly maker: Address,
    readonly makerToken: Address,
    readonly makerAmount: Amount,
    readonly taker: Address,
    readonly takerTokens: Address[],
    readonly reinvest: boolean,
    readonly lockedUntil: Timestamp,
  ) {
    super()
  }

  async check(model: ColiquidityBlockchainModel) {
    const balance = await this.getBalanceAmount(this.maker, this.makerToken, model)
    return balance.gte(this.makerAmount)
  }

  async run(model: ColiquidityBlockchainModel, real: ColiquidityBlockchainReal) {
    await this.expectTxes(this.runModel(model), this.runReal(real))
  }

  async runModel(model: ColiquidityBlockchainModel) {

  }

  async runReal(real: ColiquidityBlockchainReal) {

  }
}
