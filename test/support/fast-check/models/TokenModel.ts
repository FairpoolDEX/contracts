import { AmountNum } from '../../../../util/types'
import { Address } from '../../../../models/Address'

export interface TokenModel {
  address: Address
  balances: BalanceModel[]
}

export interface BalanceModel {
  address: Address
  amount: AmountNum
}
