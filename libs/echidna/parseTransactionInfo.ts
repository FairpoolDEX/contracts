import { FunctionCall, parseFunctionCall } from '../../utils-local/parseFunctionCall'
import { Rewrite } from '../utils/rewrite'
import { Address } from '../../models/Address'
import { TransactionInfo } from './models/TransactionInfo'
import { ensure, ensureFind } from '../utils/ensure'
import { parseAddress } from '../ethereum/models/Address'
import { bn } from '../bn/utils'
import { zip } from 'remeda'
import { hexZeroPad } from 'ethers/lib/utils'

export const parseTransactionInfo = (signatures: FunctionCall[], rewrites: Rewrite<Address>[]) => (origin: string): TransactionInfo => {
  const [callRaw] = origin.split(' ')
  const call = parseFunctionCall(callRaw)
  const name = call.name as TransactionInfo['name']
  const signature = ensureFind(signatures, s => s.name === name, new Error(`Can't find ${name} function in the list of contract signatures`))
  const from = parseLineComponent('from', parseAddress, origin)
  const value = parseLineComponent('Value', bn, origin) || bn(0)
  const timeDelay = parseLineComponent('Time delay', bn, origin) || bn(0)
  const blockDelay = parseLineComponent('Block delay', bn, origin) || bn(0)
  const args = parseTransactionInfoArgs(signature.args, rewrites)(call.args)
  const caller = (from ? ensureFind(rewrites, c => c.from === from) : rewrites[0]).to
  return { origin, caller, name, args, value, blockDelay, timeDelay }
}

export const parseTransactionInfoArgs = (types: string[], rewrites: Rewrite<Address>[]) => (args: string[]) => {
  ensure(types.length === args.length)
  let from: Address
  let rewrite: Rewrite<Address> | undefined
  return zip(args, types).map(([arg, type]) => {
    switch (true) {
      case type.startsWith('int'):
      case type.startsWith('uint'):
        return bn(arg)
      case type === 'string':
        return arg
      case type === 'address':
        from = parseAddress(hexZeroPad(arg, 20))
        rewrite = rewrites.find(r => r.from === from)
        return rewrite ? rewrite.to : from
      default:
        throw new Error(`Unknown type "${type}" for arg "${arg}"`)
    }
  })
}

export function parseLineComponent<T>(name: string, parser: (value: string) => T, line: string) {
  const matches = line.match(new RegExp(`${name}: ([^\\s]+)`))
  if (matches) {
    return parser(matches[1])
  }
}
