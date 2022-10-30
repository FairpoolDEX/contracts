import { z } from 'zod'
import { AddressSchema } from './Address'
import { AmountBNSchema } from './AmountBN'
import { BlockNumberSchema } from './BlockNumber'
import { TransactionHashSchema, zeroTransactionHash } from './TransactionHash'
import { $zero } from '../data/allAddresses'
import { zero } from '../libs/bn/constants'

export const TransferSchema = z.object({
  from: AddressSchema,
  to: AddressSchema,
  amount: AmountBNSchema,
  blockNumber: BlockNumberSchema,
  transactionHash: TransactionHashSchema,
})

export const CachedTransferSchema = TransferSchema.extend({
  amount: z.string(),
})

export type Transfer = z.infer<typeof TransferSchema>

export type CachedTransfer = z.infer<typeof CachedTransferSchema>

export function validateTransfer(transfer: Transfer) {
  return TransferSchema.parse(transfer)
}

export const zeroTransfer = validateTransfer({
  from: $zero,
  to: $zero,
  amount: zero,
  blockNumber: 0,
  transactionHash: zeroTransactionHash,
})

export function validatePartialTransfer(transfer: Partial<Transfer>) {
  return validateTransfer({
    ...zeroTransfer,
    ...transfer,
  })
}
