import { BigNumber, Contract } from 'ethers'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { TransferTopic } from '../../util/topic'
import { Address } from '../../models/Address'

export type Transfer = {
  from: Address,
  to: Address,
  amount: BigNumber
  blockNumber: number
  transactionHash: string
}

export async function getTransfers(token: Contract, from: BlockTag, to: BlockTag): Promise<Array<Transfer>> {
  const transfersRaw = await token.queryFilter({ topics: [TransferTopic] }, from, to)
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
