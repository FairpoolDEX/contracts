import { BlockchainCommand } from "../../support/fast-check/commands/BlockchainCommand"
import { BlockchainModel} from "../../support/fast-check/models/BlockchainModel"
import { Address, AmountNum, Timestamp } from "../../../util/types"
import { Coliquidity } from "../../../typechain"
import { BlockchainReal } from "../../support/fast-check/models/BlockchainReal"

export abstract class ColiquidityCommand<Result> extends BlockchainCommand<ColiquidityModel, ColiquidityReal, Result> {
  constructor() {
    super()
  }
}

export interface ColiquidityModel extends BlockchainModel, ColiquidityBase {
  coliquidity: {
    offers: OfferModel[]
  }
}

export interface ColiquidityReal extends BlockchainReal, ColiquidityBase {
  coliquidity: Coliquidity
}

export interface ColiquidityBase {

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

export type OfferIndex = number
