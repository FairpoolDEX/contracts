import { Event } from '../libs/ethereum/models/Event'
import { TypedEvent } from '../typechain-types/common'
import { ChainId } from '../libs/ethereum/models/ChainId'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromRawEvent = (chainId: ChainId) => <TArgsObject>(parse: (obj: TArgsObject & Event) => TArgsObject) => <TArgsArray extends Array<any> = any>(e: TypedEvent<TArgsArray, TArgsObject>) => parse({
  ...e.args,
  ...e,
  chainId,
})
