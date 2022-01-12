import { BigNumber, Contract } from 'ethers'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { TransferTopic } from '../../util/topic'
import { Address } from '../../models/Address'
import { cache, getCacheKey } from '../../util/cache'
import { Event } from '@ethersproject/contracts/src.ts/index'
import { flatten, range } from 'lodash'
import { maxBlocksPerQueryFilterRequest, rateLimiter } from '../../util/getblock'
import { debug } from '../../util/debug'
import { getBlockNumber } from '../../util/ethers'

export type Transfer = {
  from: Address,
  to: Address,
  amount: BigNumber
  blockNumber: number
  transactionHash: string
}

async function getTransferEvents(token: Contract, from: string | number, to: string | number) {
  await rateLimiter.removeTokens(1)
  debug(__filename, getTransferEvents, token.address, from, to)
  return token.queryFilter({ topics: [TransferTopic] }, from, to)
}

async function getTransferEventsCached(token: Contract, from: string | number, to: string | number): Promise<Event[]> {
  const cacheKey = getCacheKey(getTransferEventsCached, token.address, from, to)
  debug(__filename, getTransferEventsCached, token.address, from, to)
  return cache.wrap(cacheKey, () => getTransferEvents(token, from, to))
}

async function getTransferEventsPaginated(token: Contract, from: BlockTag, to: BlockTag): Promise<Event[]> {
  debug(__filename, getTransferEventsPaginated, token.address, from, to)
  const $from = await getBlockNumber(token.provider, from)
  const $to = await getBlockNumber(token.provider, to)
  const blockNumbers = range($from, $to, maxBlocksPerQueryFilterRequest)
  const transferEventsArray = await Promise.all(blockNumbers.map(blockNumber => getTransferEventsCached(token, blockNumber, blockNumber + maxBlocksPerQueryFilterRequest)))
  return flatten(transferEventsArray)
}

export async function getTransfers(token: Contract, from: BlockTag, to: BlockTag): Promise<Transfer[]> {
  const transferEvents = await getTransferEventsPaginated(token, from, to)
  return transferEvents.map(getTransferFromEvent)
}

function getTransferFromEvent(e: Event) {
  if (!e.args) throw new Error()
  // if (e.args.from === "0x59B8c20CA527ff18e2515b68F28939d6dD3E867B") {
  //   console.log("e", e)
  // }
  return {
    from: e.args.from,
    to: e.args.to,
    amount: e.args.value,
    blockNumber: e.blockNumber,
    transactionHash: e.transactionHash,
  }
}
