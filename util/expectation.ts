import { BigNumber } from 'ethers'
import { expect } from './expect'
import { Filename } from './filesystem'
import { BalanceBN } from '../models/BalanceBN'

export async function importExpectations(expectationsPath: Filename) {
  return (await import(`${process.cwd()}/${expectationsPath}`)).expectations
}

export function expectBalances(actual: BalanceBN[], expected: BalanceBN[]) {
  for (const $balance of expected) {
    const balance = actual.find(b => b.address === $balance.address)
    const amount = balance?.amount ?? BigNumber.from('0')
    expect(amount, `on address ${$balance.address}`).to.equal($balance.amount)
  }
}
