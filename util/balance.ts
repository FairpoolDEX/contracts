import { expect } from './expect'
import neatcsv from 'neat-csv'
import { RawCSVData } from './csv'
import { shuffle } from 'lodash'
import { sumBigNumbers, zero } from './bignumber'
import { AddressSchema } from '../models/Address'
import { Filename } from './filesystem'
import { writeFile } from 'fs/promises'
import { AmountBN } from '../models/AmountBN'
import { BalanceBN, BalanceBNSchema, validateBalanceBN } from '../models/BalanceBN'
import { parseAmountBNCSV } from '../models/AmountBN/parseAmountBNCSV'

export type BalancesMap = { [address: string]: AmountBN }

export async function parseBalancesCSV(data: RawCSVData): Promise<BalancesMap> {
  const balancesMap: BalancesMap = {}
  const rows = await neatcsv(data)
  for (let i = 0; i < rows.length; i++) {
    const addressRaw = rows[i]['HolderAddress']
    const amountRaw = rows[i]['Balance']
    // console.log('[addressRaw, amountRaw]', [addressRaw, amountRaw])
    const addressParsed = AddressSchema.parse(addressRaw)
    const amountParsed = parseAmountBNCSV(amountRaw)
    balancesMap[addressParsed] = amountParsed
  }
  return balancesMap
}

export function padAmount(amountRaw: string, decimals = 18) {
  const splinters = amountRaw.split('.')
  const whole = splinters[0]
  const fraction = splinters[1] ?? '0'
  expect(whole.length).to.be.gte(1)
  expect(fraction.length).to.be.gte(1)
  return `${whole}.${fraction.padEnd(decimals, '0')}`
}

export function sumBalanceAmounts(balances: BalanceBN[]) {
  return sumBigNumbers(balances.map(b => b.amount))
}

export function getBalancesFromMap(balanceMap: BalancesMap): BalanceBN[] {
  return Object.entries(balanceMap).map(([address, amount]) => validateBalanceBN({ address, amount }))
}

export function encodeBalances(balances: BalanceBN[]) {
  return balances.map(b => [b.address, b.amount.toString()])
}

export async function writeClaims(balances: BalanceBN[], out: Filename) {
  return writeFile(out, JSON.stringify(encodeBalances(balances)))
}

export function decodeBalances(balances: unknown) {
  if (balances instanceof Array) {
    return balances.map(b => BalanceBNSchema.parse({
      address: b[0],
      amount: b[1],
    }))
  } else {
    throw new Error('Balances must be an array')
  }
}

export async function readBalances(balancesFilename: Filename) {
  return decodeBalances(await import(balancesFilename.toString()))
}

export function mergeBalance(balances: BalanceBN[], balance: BalanceBN) {
  // TODO: Rewrite in an immutable way
  const $balance = balances.find(b => b.address === balance.address)
  if ($balance) {
    Object.assign($balance, balance)
  } else {
    balances.push(balance)
  }
  return balances
}

export function sumBalances(balances: BalanceBN[]): BalanceBN[] {
  return getBalancesFromMap(balances.reduce<BalancesMap>(function (balancesMap, balance) {
    const { address, amount } = balance
    if (balancesMap[address]) {
      balancesMap[address] = balancesMap[address].add(amount)
    } else {
      balancesMap[address] = amount
    }
    return balancesMap
  }, {}))
}

export function optimizeForGasRefund(balances: BalanceBN[]): BalanceBN[] {
  return shuffle(balances)
}

export function isZeroBalance(balance: BalanceBN) {
  return balance.amount.eq(zero)
}
