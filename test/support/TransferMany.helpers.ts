import { RunnableContext } from '../../util-local/context/getRunnableContext'
import { GenericTokenWithVesting } from '../../typechain-types'
import { BalanceBN } from '../../models/BalanceBN'
import { chunk } from './all.helpers'
import { sendMultipleTransactions } from '../../util-local/ethers'
import { getOverrides } from '../../util-local/network'

export async function transferManyBalanceBN(context: RunnableContext, token: GenericTokenWithVesting, balances: BalanceBN[], chunkSize: number) {
  const balancesChunks = chunk(balances, chunkSize)
  return sendMultipleTransactions(context, balancesChunks, transferManyBalanceBNChunk, token)
}

export async function transferManyBalanceBNChunk(balances: BalanceBN[], token: GenericTokenWithVesting) {
  // const entries = balancesChunks[i]
  // const entriesForDisplay = balancesChunks[i].map(([address, amount]) => [address, amount.toString()])
  // log && log(`Chunk ${i + 1} / ${balancesChunks.length}:`)
  // log && log(fromPairs(entriesForDisplay))
  const addresses = balances.map(b => b.address)
  const amounts = balances.map(b => b.amount)
  const overrides = await getOverrides(token.signer)
  return token.transferMany(addresses, amounts, overrides)
}
