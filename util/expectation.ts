import { BigNumber } from 'ethers'
import { expect } from './expect'
import { Filename } from './filesystem'
import { BalanceBN } from '../models/BalanceBN'
import { AmountBN } from '../models/AmountBN'
import { sumBalanceAmounts } from './balance'

export async function importExpectations(expectationsPath: Filename) {
  return (await import(`${process.cwd()}/${expectationsPath}`)).expectations
}

export async function importDefault(filename: Filename) {
  return (await import(`${process.cwd()}/${filename}`)).default
}

export function expectBalances(expectedBalances: BalanceBN[], actualBalances: BalanceBN[]) {
  for (const expectedBalance of expectedBalances) {
    const address = expectedBalance.address
    const actualBalance = actualBalances.find(b => b.address === address)
    const actualAmount = actualBalance?.amount ?? BigNumber.from('0')
    const expectedAmount = expectedBalance.amount
    expect(expectedAmount, `on address ${address}`).to.equal(actualAmount)
  }
}

export function expectTotalAmount(expectedTotalAmount: AmountBN, balances: BalanceBN[]) {
  expect(expectedTotalAmount).to.equal(sumBalanceAmounts(balances))
  // expect(totalAmount.gt(expectedTotalAmount.min)).to.be.true
  // expect(totalAmount.lt(expectedTotalAmount.max)).to.be.true
}

export function expectUnderTotalAmount(expectedTotalAmount: AmountBN, delta: AmountBN, balances: BalanceBN[]) {
  const actualTotalAmount = sumBalanceAmounts(balances)
  expect(expectedTotalAmount).to.be.gte(actualTotalAmount)
  expect(expectedTotalAmount.sub(delta)).to.be.lte(actualTotalAmount)
}

export interface Expected {
  expectations: Filename
}
