import { MaxUint256 } from '../all.helpers'
import { TradingSimulation } from './TradingSimulation'

export class ColiquiditySimulation extends TradingSimulation {
  async run() {
    this.debug('addLiquidity from sam')
    await this.addLiquidityFromSam()
    await this.logBalances()

    this.debug('addLiquidity from alice')
    const baseDeposit = this.baseInitialAmount.div(this.depositRatio)
    const quoteDeposit = this.quoteInitialAmount.div(this.depositRatio)
    await this.router.connect(this.alice).addLiquidity(this.base.address, this.quote.address, baseDeposit, quoteDeposit, baseDeposit, quoteDeposit, this.alice.address, MaxUint256)
    const pairBalanceOfAlice = await this.pair.balanceOf(this.alice.address)
    const pairTotalSupply = await this.pair.totalSupply()
    const baseBalanceOfPair = await this.base.balanceOf(this.pair.address)
    const quoteBalanceOfPair = await this.quote.balanceOf(this.pair.address)
    const baseExpected = baseBalanceOfPair.mul(pairBalanceOfAlice).div(pairTotalSupply)
    const quoteExpected = quoteBalanceOfPair.mul(pairBalanceOfAlice).div(pairTotalSupply)
    await this.logBalances()

    this.debug('trade from bob in cycle')
    await this.tradeFromBobInCycle()
    await this.logBalances()

    this.debug('buy from zed')
    await this.buyFromZed()
    await this.logBalances()

    this.debug('removeLiquidity from alice')
    await this.pair.connect(this.alice).approve(this.router.address, MaxUint256)
    await this.router.connect(this.alice).removeLiquidity(this.base.address, this.quote.address, pairBalanceOfAlice, 0, 0, this.alice.address, MaxUint256)
    await this.logBalances()

    await this.calculateProfitFromAlice('using coliquidity')
  }
}
