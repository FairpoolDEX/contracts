import { GenericState } from '../../libs/divide-and-conquer/GenericState'
import { BigNumber } from 'bignumber.js'
import { Timestamp } from '../../util-local/types'
import { ERC20EnumerableError as ErrorERC20EnumerableSimple } from './ERC20EnumerableCommon'

type UserId = number

type AssetId = number

interface User {
  id: UserId
}

interface Asset {
  id: AssetId
}

interface Order {
  userId: UserId
  baseId: AssetId
  quoteId: AssetId
  price: BigNumber
  amount: BigNumber // base amount; negative if selling
}

interface Trade {
  makerId: UserId
  takerId: UserId
  baseId: AssetId
  quoteId: AssetId
  price: BigNumber // quote amount per 1 base unit
  amount: BigNumber // base amount; negative if selling
  timestamp: Timestamp
}

export interface Data {
  orders: Order[]
  trades: Trade[]
}

export type Out = undefined

export type Err = ErrorERC20EnumerableSimple

const { MathSubUnderflow, MathAddUnderflow, MathAddOverflow, TransferAmountExceedsBalance, MintToZeroAddress, TransferToZeroAddress, TransferFromZeroAddress } = ErrorERC20EnumerableSimple

type State = GenericState<Data, Out, Err>
