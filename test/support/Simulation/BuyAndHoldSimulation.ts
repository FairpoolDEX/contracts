import { expect } from '../../../utils-local/expect'
import { TradingSimulation } from './TradingSimulation'
import { MaxUint256 } from '../../../libs/ethereum/constants'

export class BuyAndHoldSimulation extends TradingSimulation {
  async run() {
    this.debug('addLiquidity from sam')
    await this.addLiquidityFromSam()
    await this.logBalances()

    this.debug('buy from alice')
    const baseDeposit = this.baseInitialAmount.div(this.depositRatio)
    const quoteDeposit = this.quoteInitialAmount.div(this.depositRatio)
    await this.router.connect(this.alice).swapExactTokensForTokensSupportingFeeOnTransferTokens(quoteDeposit, 0, [this.quote.address, this.base.address], this.alice.address, MaxUint256)
    const baseBought = (await this.base.balanceOf(this.alice.address)).sub(this.baseInitialAmount)
    expect(!baseBought.isNegative())
    await this.logBalances()

    this.debug('trade from bob in cycle')
    await this.tradeFromBobInCycle()
    await this.logBalances()

    this.debug('buy from zed')
    await this.buyFromZed()
    await this.logBalances()

    this.debug('sell from alice')
    await this.router.connect(this.alice).swapExactTokensForTokensSupportingFeeOnTransferTokens(baseBought, 0, [this.base.address, this.quote.address], this.alice.address, MaxUint256)
    expect(await this.base.balanceOf(this.alice.address)).to.eq(this.baseInitialAmount)
    await this.logBalances()

    await this.calculateProfitFromAlice('trading')
  }
}
