import { strict as assert } from 'assert'
import { expect } from './expect'
import { AmountBN } from './types'
import neatcsv from 'neat-csv'
import { CSVData } from './csv'
import { trimEnd } from 'lodash'
import { utils } from 'ethers'
import { sumBigNumbers } from './bignumber'
import { Address } from './address'

export type BalanceMap = { [index: string]: AmountBN }

export interface BalanceBN {
  address: Address
  amount: AmountBN
}

export async function parseBalancesCSV(data: CSVData): Promise<BalanceMap> {
  const balances: BalanceMap = {}
  const rows = await neatcsv(data)
  for (let i = 0; i < rows.length; i++) {
    const addressRaw = rows[i]['HolderAddress']
    const amountRaw = rows[i]['Balance']
    // console.log('[addressRaw, amountRaw]', [addressRaw, amountRaw])
    const addressParsed = addressRaw.toLowerCase()
    const amountParsed = utils.parseUnits(amountRaw, 18)
    assert.equal(trimEnd(utils.formatUnits(amountParsed, 18), '0'), trimEnd(amountRaw, '0'), 'Can\'t parse balance')
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

export function sumBalances(balances: BalanceBN[]) {
  return sumBigNumbers(balances.map(b => b.amount))
}

export function getBalancesFromMap(balanceMap: BalanceMap): BalanceBN[] {
  return Object.entries(balanceMap).map(([address, amount]) => ({ address, amount }))
}
