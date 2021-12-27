import { expect } from './expect'
import { AmountBN } from './types'
import neatcsv from 'neat-csv'
import { CSVData } from './csv'
import { toTokenAmount } from '../test/support/all.helpers'
import Decimal from 'decimal.js'

export type BalanceMap = { [index: string]: AmountBN }

export async function parseBalancesCSV(data: CSVData): Promise<BalanceMap> {
  const balances: BalanceMap = {}
  const rows = await neatcsv(data)
  for (let i = 0; i < rows.length; i++) {
    const addressRaw = rows[i]['HolderAddress']
    const amountRaw = rows[i]['Balance']
    console.log('[addressRaw, amountRaw]', [addressRaw, amountRaw])
    const addressParsed = addressRaw.toLowerCase()
    const amountParsed = toTokenAmount(new Decimal(amountRaw))
    balances[addressParsed] = amountParsed
  }
  return balances
}

export function padAmount(amountRaw: string, decimals = 18) {
  const splinters = amountRaw.split('.')
  const whole = splinters[0]
  const fraction = splinters[1] ?? '0'
  expect(whole.length).to.be.gte(1)
  expect(fraction.length).to.be.gte(1)
  return `${whole}.${fraction.padEnd(decimals, '0')}`
}
