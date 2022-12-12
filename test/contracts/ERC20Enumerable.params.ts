import { Address } from '../../models/Address'
import { AmountBN } from '../../models/AmountBN'

export type MintParams = { to: Address, amount: AmountBN }

export type TransferParams = { from: Address, to: Address, amount: AmountBN }
