import { OfferIndex } from "../ColiquidityCommand"
import { Address, AmountNum, Timestamp } from "../../../../util/types"

export interface OfferCreatedEvent {
  timestamp: Timestamp
  offerIndex: OfferIndex
  maker: Address
  makerAmount: AmountNum
  takerDenominator: AmountNum
  makerDenominator: AmountNum
  pausedUntil: Timestamp
  // probably more
}

// Emitted by UniswapV2Factory
export interface PairCreatedEvent {
  timestamp: Timestamp
  token0: Address,
  token1: Address
  pair: Address
  allPairsLength: number
}
