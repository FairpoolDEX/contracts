import { ContractTransaction } from '@ethersproject/contracts'
import { sumBNs } from '../../libs/bn/utils'
import { fromTransactionReceiptToFee } from './fromTransactionReceiptToFee'

export async function sumFees(transactions: ContractTransaction[]) {
  const receipts = await Promise.all(transactions.map(t => t.wait(1)))
  return sumBNs(receipts.map(fromTransactionReceiptToFee))
}
