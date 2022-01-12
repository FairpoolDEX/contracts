import { z } from 'zod'
import { AddressSchema } from './Address'
import { AmountBNSchema } from './AmountBN'
import { BlockNumberSchema } from './BlockNumber'
import { TransactionHashSchema } from './TransactionHash'

export const TransferSchema = z.object({
  from: AddressSchema,
  to: AddressSchema,
  amount: AmountBNSchema,
  blockNumber: BlockNumberSchema,
  transactionHash: TransactionHashSchema,
})

export type Transfer = z.infer<typeof TransferSchema>

export function validateTransfer(transfer: Transfer) {
  return TransferSchema.parse(transfer)
}
