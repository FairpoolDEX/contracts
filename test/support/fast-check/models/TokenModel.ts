import { Address, AmountNum } from "../../../../util/types"

export interface TokenModel {
  address: Address
  balances: BalanceModel[]
}

export interface BalanceModel {
  address: Address
  amount: AmountNum
}
