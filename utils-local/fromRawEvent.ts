import { Event } from '../libs/ethereum/models/Event'
import { TypedEvent } from '../typechain-types/common'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromRawEvent = <TArgsObject>(parse: (obj: TArgsObject & Event) => TArgsObject) => <TArgsArray extends Array<any> = any>(e: TypedEvent<TArgsArray, TArgsObject>) => parse({
  ...e.args,
  blockNumber: e.blockNumber,
  transactionHash: e.transactionHash,
})
