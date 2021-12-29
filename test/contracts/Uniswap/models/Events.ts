// Emitted by UniswapV2Factory
import { AmountNum, Timestamp } from '../../../../util/types'
import { Address } from '../../../../models/Address'

export interface PairCreated {
  timestamp: Timestamp
  token0: Address,
  token1: Address
  pair: Address
  allPairsLength: number
}

export interface Swap {
  sender: Address,
  amount0In: AmountNum,
  amount1In: AmountNum,
  amount0Out: AmountNum,
  amount1Out: AmountNum,
  to: Address
}
