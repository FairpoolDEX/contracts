import { TransactionInfo } from './models/TransactionInfo'
import { stringifyArg } from './stringifyArg'

export const stringifyTransaction = (transaction: TransactionInfo) => {
  const { caller, name, args, blockDelay, timeDelay, value } = transaction
  const splinters = []
  splinters.push(`${name}(${args.map(stringifyArg).join(',')})`)
  splinters.push(`From: ${caller}`)
  splinters.push(`Value: ${value.toString()}`)
  splinters.push(`Time delay: ${timeDelay.toString()}`)
  splinters.push(`Block delay: ${blockDelay.toString()}`)
  return splinters.join(' ')
}
