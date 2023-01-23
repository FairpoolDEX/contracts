import { AmountBN } from '../AmountBN'
import { padAmount } from '../../utils-local/balance'
import { parseAmountCSV } from './parseAmountCSV'

export function parseEtherscanAmountCSV(decimals: number, amount: string): AmountBN {
  const amountClean = amount.replace(/,/g, '')
  const amountPadded = padAmount(decimals, amountClean)
  return parseAmountCSV(amountPadded)
}
