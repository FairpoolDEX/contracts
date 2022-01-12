import { BigNumber, Contract } from 'ethers'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { TransferTopic } from '../../util/topic'
import { Address } from '../../models/Address'
import { cache, getCacheKey } from '../../util/cache'
import { Event } from '@ethersproject/contracts/src.ts/index'

export type Transfer = {
  from: Address,
  to: Address,
  amount: BigNumber
  blockNumber: number
  transactionHash: string
}

async function getTransfersRaw(token: Contract, from: string | number, to: string | number): Promise<Array<Event>> {
  const cacheKey = getCacheKey(getTransfersRaw.name, [token.address, from, to])
  return cache.wrap(cacheKey, function () {
    return token.queryFilter({ topics: [TransferTopic] }, from, to)
  })
}

export async function getTransfers(token: Contract, from: BlockTag, to: BlockTag): Promise<Array<Transfer>> {
  const transfersRaw = await getTransfersRaw(token, from, to)
  return transfersRaw.map((e) => {
    if (!e.args) throw new Error()
    // if (e.args.from === "0x59B8c20CA527ff18e2515b68F28939d6dD3E867B") {
    //   console.log("e", e)
    // }
    const transfer = {
      from: e.args.from,
      to: e.args.to,
      amount: e.args.value,
      blockNumber: e.blockNumber,
      transactionHash: e.transactionHash,
    }
    return transfer
  })
}
