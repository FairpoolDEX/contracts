import { AmountNum } from '../../../../util-local/types'
import { ColiquidityCommand, ColiquidityModel, ColiquidityReal } from '../ColiquidityCommand'
import { AsyncCommand } from 'fast-check'
import { MaxUint256 } from '../../../support/all.helpers'
import { getLatestBlock } from '../../../support/test.helpers'
import { getLiquidityAfterBuy, getLiquidityAfterSell } from '../../../support/Coliquidity.generic.helpers'
import { uniswapFeeNumber } from '../../../support/Uniswap.helpers'
import { Address } from '../../../../models/Address'

export class SwapCommand extends ColiquidityCommand<unknown> implements AsyncCommand<ColiquidityModel, ColiquidityReal, true> {
  constructor(
    readonly sender: Address,
    readonly fromToken: Address,
    readonly toToken: Address,
    readonly fromAmountDiff: AmountNum,
  ) {
    super()
  }

  async check(model: ColiquidityModel) {
    return true
  }

  async runModel(model: ColiquidityModel) {
    const pair = await this.getModelPair(model, this.fromToken, this.toToken)
    const getLiquidityAfterSwap = pair.tokens[0] === this.fromToken ? getLiquidityAfterSell : getLiquidityAfterBuy
    // TODO: Replace UniswapFee with dynamic fee parameter
    pair.reserves = getLiquidityAfterSwap(pair.reserves[0], pair.reserves[1], this.fromAmountDiff, uniswapFeeNumber)
    return pair.reserves
  }

  async runReal(real: ColiquidityReal) {
    const from = await getLatestBlock(real.ethers)
    const router = real.router.connect(this.getSigner(real, this.sender))
    await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(this.fromAmountDiff, 0, [this.fromToken, this.toToken], this.sender, MaxUint256)
    const pair = await this.getRealPair(real, this.fromToken, this.toToken)
    const reserves = await pair.getReserves()
    // const swaps = await pair.queryFilter({ topics: [SwapTopic] }, from.number)
    // expect(swaps).to.have.length(1)
    // const swap = swaps[0]
    // const swapArgs = swap.args as unknown as Swap
    return [reserves[0].toNumber(), reserves[1].toNumber()]
  }
}
