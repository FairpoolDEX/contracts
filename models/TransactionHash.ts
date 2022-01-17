import { z } from 'zod'

export const TransactionHashSchema = z.string().regex(/^0x([A-Fa-f0-9]{64})$/)

export type TransactionHash = z.infer<typeof TransactionHashSchema>

export function validateTransactionHash(hash: TransactionHash) {
  return TransactionHashSchema.parse(hash)
}

export function getTransactionHashUid(hash: TransactionHash): string {
  return hash
}

export const zeroTransactionHash = validateTransactionHash('0x' + '0'.repeat(64))
