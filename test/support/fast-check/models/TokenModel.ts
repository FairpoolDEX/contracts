import { AmountNum } from '../../../../util/types'
import { Address } from '../../../../util/address'

export interface TokenModel {
  address: Address
  balances: BalanceModel[]
}

export interface BalanceModel {
  address: Address
  amount: AmountNum
}
