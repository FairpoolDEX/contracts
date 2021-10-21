import { BlockchainCommand } from "../../support/fast-check/commands/BlockchainCommand"
import { BlockchainModel } from "../../support/fast-check/models/BlockchainModel"
import { Address, AmountNum, Timestamp } from "../../../util/types"
import { Coliquidity } from "../../../typechain"
import { BlockchainReal } from "../../support/fast-check/models/BlockchainReal"
import { demand } from "../../../util/demand"

export abstract class ColiquidityCommand<Result> extends BlockchainCommand<ColiquidityModel, ColiquidityReal, Result> {
  readonly maker?: Address
  readonly taker?: Address

  constructor() {
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
}

export interface ColiquidityModel extends BlockchainModel, ColiquidityBase {
  coliquidity: {
    offers: OfferModel[]
    contributions: ContributionModel[]
  }
}

export interface ColiquidityReal extends BlockchainReal, ColiquidityBase {
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

export type OfferIndex = number

export type ContributionIndex = number
