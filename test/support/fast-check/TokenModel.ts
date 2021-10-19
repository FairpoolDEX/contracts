import { Address, Amount } from "../../../util/types"

export interface TokenModel {
  address: Address
  balances: BalanceModel[]
}

export interface BalanceModel {
  owner: Address
  amount: Amount
}
