import { ContractReceipt } from 'ethers'

export function fromTransactionReceiptToFee(receipt: ContractReceipt) {
  return receipt.gasUsed.mul(receipt.effectiveGasPrice)
}
