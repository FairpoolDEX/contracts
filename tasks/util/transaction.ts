import { RunnableContext } from '../../util-local/context/getRunnableContext'
import { ContractTransaction } from 'ethers'
import { getTransactionUrl } from '../../util/url'

export async function logAndWaitForTransactions(context: RunnableContext, minConfirmations: number, transactions: ContractTransaction[]) {
  const { log, signer } = context
  return Promise.all(transactions.map(async tx => {
    log(await getTransactionUrl(tx, signer))
    await tx.wait(minConfirmations)
  }))
}
