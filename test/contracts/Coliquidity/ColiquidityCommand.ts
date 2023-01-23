import { BlockchainCommand } from '../../support/fast-check/commands/BlockchainCommand'
import { BlockchainModel } from '../../support/fast-check/models/BlockchainModel'
import { AmountNum, Ethers, Timestamp } from '../../../utils-local/types'
import { Coliquidity, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02 } from '../../../typechain-types'
import { BlockchainReal } from '../../support/fast-check/models/BlockchainReal'
import { demand } from '../../../utils-local/demand'
import { expect } from '../../../utils-local/expect'
import { Address } from '../../../models/Address'
import { $zero } from '../../../data/allAddresses'

export abstract class ColiquidityCommand<Result> extends BlockchainCommand<ColiquidityModel, ColiquidityReal, Result> {
  readonly maker?: Address
  readonly taker?: Address

  protected constructor() {
    super()
  }

  getMakerSigner(real: ColiquidityReal) {
    return this.getSigner(real, demand(this.maker))
  }

  getTakerSigner(real: ColiquidityReal) {
    return this.getSigner(real, demand(this.taker))
  }

  getSigner(real: ColiquidityReal, address: string) {
    return demand(real.signers.find(s => s.address === address))
  }

  async getModelPair(model: ColiquidityModel, token0: Address, token1: Address) {
    return demand(model.pairs.find(pool => {
      return (
        pool.tokens[0] === token0 && pool.tokens[1] === token1 ||
        pool.tokens[0] === token1 && pool.tokens[1] === token0
      )
    }))
  }

  async getRealPair(real: ColiquidityReal, token0: string, token1: string) {
    const pairAddress = await real.factory.getPair(token0, token1)
    expect(pairAddress).to.not.equal($zero)
    const pair = await real.ethers.getContractAt('UniswapV2Pair', pairAddress) as UniswapV2Pair
    return pair
  }
}

export interface ColiquidityModel extends BlockchainModel, ColiquidityBase {
  coliquidity: {
    offers: OfferModel[]
    contributions: ContributionModel[]
  }
  pairs: PairModel[]
}

export interface ColiquidityReal extends BlockchainReal, ColiquidityBase {
  ethers: Ethers
  router: UniswapV2Router02
  factory: UniswapV2Factory
  coliquidity: Coliquidity
}

export interface ColiquidityBase {
  dummy?: string
}

export interface OfferModel {
  maker: Address,
  makerToken: Address,
  makerAmount: AmountNum,
  taker: Address,
  takerTokens: Address[],
  makerDenominator: AmountNum,
  takerDenominator: AmountNum,
  reinvest: boolean,
  pausedUntil: Timestamp,
  lockedUntil: Timestamp,
}

export interface ContributionModel {
  taker: Address
  offerIndex: OfferIndex
  takerToken: Address
  takerAmount: AmountNum
}

export interface PositionModel {
  offerIndex: OfferIndex
  maker: Address
  taker: Address
  makerToken: Address // SHLD, BULL, LINK, ...
  takerToken: Address // USDT, WETH, WBTC, ...
  makerAmount: AmountNum // needed to calculate the fee
  takerAmount: AmountNum // needed to calculate the fee
  liquidityAmount: AmountNum
  lockedUntil: Timestamp // UNIX timestamp
}

export interface PairModel {
  tokens: [Address, Address]
  reserves: [AmountNum, AmountNum]
}

export type OfferIndex = number

export type ContributionIndex = number

export type PoolIndex = number
