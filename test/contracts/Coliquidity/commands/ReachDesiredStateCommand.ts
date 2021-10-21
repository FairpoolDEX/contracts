import { Address, AmountNum, Timestamp } from "../../../../util/types"
import { ColiquidityCommand, ColiquidityModel, ColiquidityReal, OfferIndex } from "../ColiquidityCommand"
import { AsyncCommand } from "fast-check"
import { task } from "../../../../util/task"
import { expect } from "../../../../util/expect"
import { TokenReal } from "../../../support/fast-check/models/TokenReal"
import { BalanceModel, TokenModel } from "../../../support/fast-check/models/TokenModel"
import { sum } from "lodash"
import { UniswapV2Pair } from "../../../../typechain"
import { OfferCreatedEvent, PairCreatedEvent } from "../models/Events"

export class ReachDesiredStateCommand extends ColiquidityCommand<AmountNum> implements AsyncCommand<ColiquidityModel, ColiquidityReal, true> {
  readonly users: Address[] = []

  constructor(
    readonly base: Address,
    readonly quote: Address,
    readonly maker: Address,
    readonly takers: Address[],
  ) {
    super()
    this.users = Array.prototype.concat([maker], takers)
  }

  async check(model: ColiquidityModel) {
    return true
  }

  async runModel(model: ColiquidityModel) {
    throw task("Add expects from runReal")

    return this.getModelFees(model)
  }

  async runReal(real: ColiquidityReal) {
    await this.expectRealPairToExist(real)
    // await this.expectInvestorsToMakeMoney()
    // await this.expectProjectToLoseTokens()
    expect(await this.getRealOutgoingTransferAmountSum(real, this.base, this.takers)).to.equal(0)
    expect(await this.getRealOutgoingTransferAmountSum(real, this.quote, [this.maker])).to.equal(0)
    if (await this.getRealVolumeIn(real, this.quote) >= await this.getRealVolumeOut(real, this.quote)) {
      expect(await this.getRealInvestorProfit(real, this.takers)).to.be.greaterThan(0)
    } else {
      expect(await this.getRealInvestorProfit(real, this.takers)).to.be.lessThanOrEqual(0)
    }
    expect(await this.getRealColiquidityTokenBalances(real)).to.deep.equal([])

    /**
     * Use events!
     * Ensure there is no such command in the chain
     * Theoretically it's OK for project to deposit their own bag of quote token
     * Expect there was no such cmd in cmds
     * [-] Expect the balance didn't change (could be achieved via transfers)
     */

    return this.getRealFees(real)
  }

  async getRealInvestorProfit(real: ColiquidityReal, takers: Address[]): Promise<AmountNum> {
    throw task()
  }

  async getRealVolumeOut(real: ColiquidityReal, tokenAddress: Address): Promise<AmountNum> {
    throw task()
  }

  async getRealVolumeIn(real: ColiquidityReal, tokenAddress: Address): Promise<AmountNum> {
    throw task()
  }

  async getModelFees(model: ColiquidityModel): Promise<AmountNum> {
    throw task()
  }

  async getRealFees(real: ColiquidityReal): Promise<AmountNum> {
    throw task()
  }

  async getRealPoolCreationTimestamp(real: ColiquidityReal, base: Address, quote: Address): Promise<Timestamp> {
    throw task()
  }

  async getRealColiquidityTokenBalances(real: ColiquidityReal) {
    const models = await Promise.all(real.tokens.map(token => this.toTokenModel(token, [real.coliquidity.address])))
    return models.filter(m => sum(m.balances.map(b => b.amount)) !== 0)
  }

  async toTokenModel(token: TokenReal, addresses: Address[]): Promise<TokenModel> {
    return {
      address: token.address,
      balances: await Promise.all(addresses.map(async (address): Promise<BalanceModel> => ({
        address: address,
        amount: (await token.balanceOf(address)).toNumber(),
      }))),
    }
  }

  async getRealPair(real: ColiquidityReal, base: Address, quote: Address): Promise<UniswapV2Pair> {
    throw task()
  }

  async expectRealPairToExist(real: ColiquidityReal) {
    const pair = await this.getRealPair(real, this.base, this.quote)
    if (!pair) throw new Error(`Expected pair to exist`)
    /**
     * TODO
     *
     * Get offer getter
     * - Get from event
     * - Store on real on create + Get from real
     */
    const OfferCreated = await this.getRealOfferCreatedEvent(real, 0)
    const PairCreated = await this.getRealPairCreatedEvent(real, this.base, this.quote)
    const initialMakerAmount = OfferCreated.makerAmount
    const initialTakerAmount = initialMakerAmount * OfferCreated.takerDenominator / OfferCreated.makerDenominator
    const initialK = initialMakerAmount * initialTakerAmount
    const currentKExpected = initialK
    expect(PairCreated.timestamp).to.be.gte(OfferCreated.pausedUntil)
    expect(await this.getRealPoolCreationDenominators(real, pair)).to.deep.equal([OfferCreated.makerDenominator, OfferCreated.takerDenominator])
    expect(await this.getRealPoolInitialLiquidity(real, pair)).to.deep.equal([initialMakerAmount, initialTakerAmount])
    expect(await this.getRealPoolCurrentK(real, pair)).to.deep.equal(currentKExpected)
  }

  async getRealOfferCreatedEvent(real: ColiquidityReal, offerIndex: OfferIndex): Promise<OfferCreatedEvent> {
    throw task()
  }

  async getRealPairCreatedEvent(real: ColiquidityReal, base: Address, quote: Address): Promise<PairCreatedEvent> {
    throw task()
  }

  private async getRealPoolCreationDenominators(real: ColiquidityReal, pair: UniswapV2Pair) {

  }

  private async getRealPoolInitialLiquidity(real: ColiquidityReal, pair: UniswapV2Pair) {

  }

  private async getRealPoolCurrentK(real: ColiquidityReal, pair: UniswapV2Pair) {

  }
}
