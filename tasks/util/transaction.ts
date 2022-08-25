import { RunnableContext } from '../../util-local/context/getRunnableContext'
import { ContractTransaction } from 'ethers'
import { getTransactionUrl } from '../../util/url'

export async function logAndWaitForTransactions(context: RunnableContext, minConfirmations: number, transactions: ContractTransaction[]) {
  const { log, signer } = context
  return Promise.all(transactions.map(async tx => {
    const url = await getTransactionUrl(tx, signer)
    log(url)
    return tx.wait(minConfirmations)
  }))
}

export async function logAndWaitForTransaction(context: RunnableContext, minConfirmations: number, transaction: ContractTransaction) {
  const { log, signer } = context
  const url = await getTransactionUrl(transaction, signer)
  log(url)
  return transaction.wait(minConfirmations)
}
