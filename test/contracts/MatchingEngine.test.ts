import { GenericState } from '../../libs/divide-and-conquer/models/GenericState'
import { BigNumber } from 'bignumber.js'
import { Timestamp } from '../../utils-local/types'

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

export type Err = Error

type State = GenericState<Data, Out, Err>
