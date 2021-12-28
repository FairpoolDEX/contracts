import { OfferIndex } from '../ColiquidityCommand'
import { Address, AmountNum, Timestamp } from '../../../../util/types'

export interface OfferCreated {
  timestamp: Timestamp
  offerIndex: OfferIndex
  maker: Address
  makerAmount: AmountNum
  takerDenominator: AmountNum
  makerDenominator: AmountNum
  pausedUntil: Timestamp
  // probably more
}
