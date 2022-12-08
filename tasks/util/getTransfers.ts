import { Contract } from 'ethers'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { TransferTopic } from '../../util-local/topic'
import { getCacheKey } from '../../util/cache'
import { Event } from '@ethersproject/contracts/src.ts/index'
import { flatten, range } from 'lodash'
import { maxBlocksPerQueryFilterRequest, rateLimiter } from '../../util-local/getblock'
import { debug } from '../../util/debug'
import { getBlockNumber } from '../../util-local/ethers'
import { Cache } from 'cache-manager'
import { Transfer, validateTransfer } from '../../models/Transfer'
import { sequentialMap } from 'zenbox-util/promise'

async function getTransfers(token: Contract, from: BlockTag, to: BlockTag) {
  await rateLimiter.removeTokens(1)
  debug(__filename, getTransfers, token.address, from, to)
  const events = await token.queryFilter({ topics: [TransferTopic] }, from, to)
  const transfers = events.map(fromEventToTransfer)
  debug(__filename, getTransfers, token.address, from, to, transfers.length)
  return transfers
}

async function getTransfersCached(token: Contract, from: BlockTag, to: BlockTag, cache: Cache) {
  // debug(__filename, getTransferEventsCached, token.address, from, to)
  const cacheKey = getCacheKey(getTransfersCached, token.address, from, to)
  const transfersCached = await cache.wrap<Transfer[]>(cacheKey, () => getTransfers(token, from, to))
  // const transfersCached = await getTransfers(token, from, to)
  return transfersCached.map(validateTransfer)
}

export async function getTransfersPaginatedCached(token: Contract, from: BlockTag, to: BlockTag, cache: Cache): Promise<Transfer[]> {
  debug(__filename, getTransfersPaginatedCached, token.address, from, to)
  const $from = await getBlockNumber(token.provider, from)
  const $to = await getBlockNumber(token.provider, to)
  const blockNumbers = range($from, $to, maxBlocksPerQueryFilterRequest)
  const transferEventsArray = await sequentialMap(blockNumbers, blockNumber => getTransfersCached(token, blockNumber, blockNumber + maxBlocksPerQueryFilterRequest, cache))
  return flatten(transferEventsArray)
}

export function fromEventToTransfer(e: Event) {
  if (!e.args) throw new Error()
  // if (e.args.from === "0x59B8c20CA527ff18e2515b68F28939d6dD3E867B") {
  //   console.log("e", e)
  // }
  return validateTransfer({
    from: e.args.from,
    to: e.args.to,
    amount: e.args.value,
    blockNumber: e.blockNumber,
    transactionHash: e.transactionHash,
  })
}
