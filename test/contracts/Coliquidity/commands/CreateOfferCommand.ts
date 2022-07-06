import { AmountNum, Timestamp } from '../../../../util-local/types'
import { ColiquidityCommand, ColiquidityModel, ColiquidityReal, OfferIndex } from '../ColiquidityCommand'
import { AsyncCommand } from 'fast-check'
import { Address } from '../../../../models/Address'

export class CreateOfferCommand extends ColiquidityCommand<OfferIndex> implements AsyncCommand<ColiquidityModel, ColiquidityReal, true> {
  constructor(
    readonly maker: Address,
    readonly makerToken: Address,
    readonly makerAmount: AmountNum,
    readonly taker: Address,
    readonly takerTokens: Address[],
    readonly makerDenominator: AmountNum,
    readonly takerDenominator: AmountNum,
    readonly reinvest: boolean,
    readonly pausedUntil: Timestamp,
    readonly lockedUntil: Timestamp,
  ) {
    super()
  }

  async check(model: ColiquidityModel) {
    const balance = await this.getModelBalanceAmount(model, this.makerToken, this.maker)
    return balance >= this.makerAmount
  }

  async runModel(model: ColiquidityModel) {
    model.coliquidity.offers.push({
      maker: this.maker,
      makerToken: this.makerToken,
      makerAmount: this.makerAmount,
      taker: this.taker,
      takerTokens: this.takerTokens,
      makerDenominator: this.makerDenominator,
      takerDenominator: this.takerDenominator,
      reinvest: this.reinvest,
      pausedUntil: this.pausedUntil,
      lockedUntil: this.lockedUntil,
    })
    const offerIndex = model.coliquidity.offers.length - 1
    return offerIndex
  }

  async runReal(real: ColiquidityReal) {
    const coliquidityMaker = real.coliquidity.connect(this.getMakerSigner(real))
    await coliquidityMaker.createOffer(this.makerToken, this.makerAmount, this.taker, this.takerTokens, this.makerDenominator, this.takerDenominator, this.reinvest, this.pausedUntil, this.lockedUntil)
    const offerIndex = (await coliquidityMaker.offersLength()).toNumber() - 1
    return offerIndex
  }

}
