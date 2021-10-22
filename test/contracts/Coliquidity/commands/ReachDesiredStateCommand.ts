import { Address, AmountNum, AmountNumPair, Timestamp } from "../../../../util/types"
import { ColiquidityCommand, ColiquidityModel, ColiquidityReal, OfferIndex } from "../ColiquidityCommand"
import { AsyncCommand } from "fast-check"
import { task } from "../../../../util/task"
import { expect } from "../../../../util/expect"
import { TokenReal } from "../../../support/fast-check/models/TokenReal"
import { BalanceModel, TokenModel } from "../../../support/fast-check/models/TokenModel"
import { sum } from "lodash"
import { UniswapV2Pair } from "../../../../typechain"
import { OfferCreated } from "../models/Events"
import { PairCreated } from "../../Uniswap/models/Events"

export class ReachDesiredStateCommand extends ColiquidityCommand<AmountNum> implements AsyncCommand<ColiquidityModel, ColiquidityReal, true> {
  readonly users: Address[] = []

  constructor(
    readonly makerToken: Address,
    readonly takerToken: Address,
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
    await this.expectModelPairToBeCorrect(model)
    await this.expectModelMakerToMakeMoney(model)
    await this.expectModelTakersToMakeMoney(model)
    await this.expectModelColiquidityToBeCorrect(model)
    return this.getModelFees(model)
  }

  async runReal(real: ColiquidityReal) {
    await this.expectRealPairToBeCorrect(real)
    await this.expectRealMakerToMakeMoney(real)
    await this.expectRealTakersToMakeMoney(real)
    await this.expectRealColiquidityToBeCorrect(real)
    return this.getRealFees(real)
  }

  async getRealProfit(real: ColiquidityReal, takers: Address[]): Promise<AmountNum> {
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

  async getRealTokenModelsWithNonZeroBalances(real: ColiquidityReal, addresses: Address[]) {
    const tokenModels = await Promise.all(real.tokens.map(token => this.toTokenModel(token, addresses)))
    return tokenModels.filter(
      m => sum(
        m.balances.filter(b => addresses.includes(b.address)).map(b => b.amount),
      ) !== 0,
    )
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

  async expectModelPairToBeCorrect(model: ColiquidityModel) {
    const pair = await this.getModelPair(model, this.makerToken, this.takerToken)

    const OfferCreated = await this.getRealOfferCreatedEvent(real, 0)
    const PairCreated = await this.getRealPairCreatedEvent(real, this.makerToken, this.takerToken)
    const initialMakerAmount = OfferCreated.makerAmount
    const initialTakerAmount = initialMakerAmount * OfferCreated.takerDenominator / OfferCreated.makerDenominator
    const initialK = initialMakerAmount * initialTakerAmount
    const currentKExpected = initialK
    expect(PairCreated.timestamp).to.be.gte(OfferCreated.pausedUntil)
    expect(await this.getRealPoolCreationDenominators(real, pair)).to.deep.equal([OfferCreated.makerDenominator, OfferCreated.takerDenominator])
    expect(await this.getRealPoolInitialLiquidity(real, pair)).to.deep.equal([initialMakerAmount, initialTakerAmount])
    expect(await this.getRealPoolCurrentK(real, pair)).to.deep.equal(currentKExpected)
  }

  async expectRealPairToBeCorrect(real: ColiquidityReal) {
    const pair = await this.getRealPair(real, this.makerToken, this.takerToken)
    const OfferCreated = await this.getRealOfferCreatedEvent(real, 0)
    const PairCreated = await this.getRealPairCreatedEvent(real, this.makerToken, this.takerToken)
    const initialMakerAmount = OfferCreated.makerAmount
    const initialTakerAmount = initialMakerAmount * OfferCreated.takerDenominator / OfferCreated.makerDenominator
    const initialK = initialMakerAmount * initialTakerAmount
    const currentKExpected = initialK
    expect(PairCreated.timestamp).to.be.gte(OfferCreated.pausedUntil)
    expect(await this.getRealPoolCreationDenominators(real, pair)).to.deep.equal([OfferCreated.makerDenominator, OfferCreated.takerDenominator])
    expect(await this.getRealPoolInitialLiquidity(real, pair)).to.deep.equal([initialMakerAmount, initialTakerAmount])
    expect(await this.getRealPoolCurrentK(real, pair)).to.deep.equal(currentKExpected)
  }

  async getRealOfferCreatedEvent(real: ColiquidityReal, offerIndex: OfferIndex): Promise<OfferCreated> {
    throw task()
  }

  async getRealPairCreatedEvent(real: ColiquidityReal, base: Address, quote: Address): Promise<PairCreated> {
    throw task()
  }

  private async getRealPoolCreationDenominators(real: ColiquidityReal, pair: UniswapV2Pair): Promise<AmountNumPair> {
    throw task()
  }

  private async getRealPoolInitialLiquidity(real: ColiquidityReal, pair: UniswapV2Pair): Promise<AmountNumPair> {
    throw task()
  }

  private async getRealPoolCurrentK(real: ColiquidityReal, pair: UniswapV2Pair): Promise<AmountNum> {
    throw task()
  }

  private async expectModelMakerToMakeMoney(model: ColiquidityModel) {
    throw task()
  }

  private async expectRealMakerToMakeMoney(real: ColiquidityReal) {
    await this.expectRealUsersNotToSpendTokens(real, this.takerToken, [this.maker])
  }

  private async expectModelTakersToMakeMoney(model: ColiquidityModel) {
    throw task()
  }

  private async expectRealTakersToMakeMoney(real: ColiquidityReal) {
    await this.expectRealUsersNotToSpendTokens(real, this.makerToken, this.takers)
    if (await this.getRealVolumeIn(real, this.takerToken) >= await this.getRealVolumeOut(real, this.takerToken)) {
      expect(await this.getRealProfit(real, this.takers)).to.be.greaterThan(0)
    } else {
      expect(await this.getRealProfit(real, this.takers)).to.be.lessThanOrEqual(0)
    }
  }

  async expectRealUsersNotToSpendTokens(real: ColiquidityReal, tokenAddress: string, userAddresses: string[]) {
    expect(await this.getRealOutgoingTransferAmountSum(real, tokenAddress, userAddresses)).to.equal(0)
  }

  private async expectModelColiquidityToBeCorrect(model: ColiquidityModel) {
    throw task()
  }

  private async expectRealColiquidityToBeCorrect(real: ColiquidityReal) {
    await this.expectRealColiquidityNotToHoldTokens(real)
  }

  async expectRealColiquidityNotToHoldTokens(real: ColiquidityReal) {
    expect(await this.getRealTokenModelsWithNonZeroBalances(real, [real.coliquidity.address])).to.deep.equal([])
  }
}
