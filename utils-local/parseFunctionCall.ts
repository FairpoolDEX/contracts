import { ensure } from '../libs/utils/ensure'
import { identity } from 'remeda'

export interface FunctionCall {
  name: string
  args: string[]
}

export function parseFunctionCall(callRaw: string): FunctionCall {
  const [_, name, argsRaw] = ensure(callRaw.match(/^(\w+)\(([^(]*)\)$/), new Error(`Can't parse the raw call: "${callRaw}"`))
  const args = argsRaw.split(',').filter(identity)
  return { name, args }
}
