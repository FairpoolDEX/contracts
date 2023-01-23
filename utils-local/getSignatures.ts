import { FunctionFragment } from '@ethersproject/abi'
import { parseFunctionCall } from './parseFunctionCall'

export function getSignatures(fragmentsRec: Record<string, FunctionFragment>) {
  const keys = Object.keys(fragmentsRec)
  return keys.map(parseFunctionCall)
}
