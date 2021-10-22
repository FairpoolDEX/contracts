import { Address, AmountNum, Timestamp } from "../../../../util/types"
import { ColiquidityCommand, ColiquidityModel, ColiquidityReal, PoolIndex, OfferIndex } from "../ColiquidityCommand"
import { AsyncCommand } from "fast-check"
import { demand } from "../../../../util/demand"
import { sortBy } from "lodash"

export class CreatePairCommand extends ColiquidityCommand<PoolIndex> implements AsyncCommand<ColiquidityModel, ColiquidityReal, true> {
  constructor(
    readonly maker: Address,
    readonly offerIndex: OfferIndex,
    readonly takerToken: Address,
    readonly deadline: Timestamp,
  ) {
    super()
  }

  async check(model: ColiquidityModel) {
    return true
  }

  async runModel(model: ColiquidityModel) {
    const coliquidity = model.coliquidity
    const offer = demand(coliquidity.offers[this.offerIndex])
    const { makerToken, makerAmount, makerDenominator, takerDenominator } = offer
    const { takerToken } = this
    const takerAmount = makerAmount * takerDenominator / makerDenominator
    const tokens: [Address, Address] = makerToken < takerToken ? [makerToken, takerToken] : [takerToken, makerToken]
    const reserves: [AmountNum, AmountNum] = makerToken < takerToken ? [makerAmount, takerAmount] : [takerAmount, makerAmount]
    model.pairs.push({
      tokens,
      reserves,
    })
    const poolIndex = model.pairs.length - 1
    return poolIndex
  }

  async runReal(real: ColiquidityReal) {
    const coliquidityMaker = real.coliquidity.connect(this.getMakerSigner(real))
    await coliquidityMaker.createPair(this.offerIndex, this.takerToken, this.deadline)
    const poolIndex = (await real.factory.allPairsLength()).toNumber() - 1
    return poolIndex
  }
}
