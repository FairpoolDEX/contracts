import { AmountNum } from '../../../../utils-local/types'
import { ColiquidityCommand, ColiquidityModel, ColiquidityReal, ContributionIndex, OfferIndex } from '../ColiquidityCommand'
import { AsyncCommand } from 'fast-check'
import { Address } from '../../../../models/Address'

export class CreateContributionCommand extends ColiquidityCommand<ContributionIndex> implements AsyncCommand<ColiquidityModel, ColiquidityReal, true> {
  constructor(
    readonly taker: Address,
    readonly offerIndex: OfferIndex,
    readonly takerToken: Address,
    readonly takerAmount: AmountNum,
  ) {
    super()
  }

  async check(model: ColiquidityModel) {
    return true
  }

  async runModel(model: ColiquidityModel) {
    model.coliquidity.contributions.push({
      taker: this.taker,
      offerIndex: this.offerIndex,
      takerToken: this.takerToken,
      takerAmount: this.takerAmount,
    })
    const contributionIndex = model.coliquidity.contributions.length - 1
    return contributionIndex
  }

  async runReal(real: ColiquidityReal) {
    const coliquidityTaker = real.coliquidity.connect(this.getTakerSigner(real))
    await coliquidityTaker.createContribution(this.offerIndex, this.takerToken, this.takerAmount)
    const contributionIndex = (await coliquidityTaker.contributionsLength()).toNumber() - 1
    return contributionIndex
  }
}
