import { MaxUint256 } from "../all.helpers"
import { expect } from "../../../util/expect"
import { TradingSimulation } from "./TradingSimulation"

export class BuyAndSellSimulation extends TradingSimulation {
  async run() {
    console.log("addLiquidity from sam")
    await this.addLiquidityFromSam()
    await this.logBalances()

    console.log("buy from alice")
    const baseDeposit = this.baseInitialAmount.div(this.depositRatio)
    const quoteDeposit = this.quoteInitialAmount.div(this.depositRatio)
    await this.router.connect(this.alice).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteDeposit, 0, [this.quote.address, this.base.address], this.alice.address, MaxUint256)
    const baseBought = (await this.base.balanceOf(this.alice.address)).sub(this.baseInitialAmount)
    expect(!baseBought.isNegative())
    await this.logBalances()

    console.log("trade from bob in cycle")
    await this.tradeFromBobInCycle()
    await this.logBalances()

    console.log("buy from bob")
    await this.buyFromBob()
    await this.logBalances()

    console.log("sell from alice")
    await this.router.connect(this.alice).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseBought, 0, [this.base.address, this.quote.address], this.alice.address, MaxUint256)
    expect(await this.base.balanceOf(this.alice.address)).to.eq(this.baseInitialAmount)
    await this.logBalances()

    await this.calculateProfitFromAlice("trading")
  }
}
