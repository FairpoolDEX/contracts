import { TransactionInfoArg } from './models/TransactionInfo'
import { BigNumber } from 'ethers'

export const stringifyArg = (arg: TransactionInfoArg): string => {
  if (arg instanceof BigNumber) {
    return arg.toString()
  } else {
    return arg
  }
}
