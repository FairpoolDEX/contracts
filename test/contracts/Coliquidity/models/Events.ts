import { OfferIndex } from '../ColiquidityCommand'
import { AmountNum, Timestamp } from '../../../../utils-local/types'
import { Address } from '../../../../models/Address'

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
