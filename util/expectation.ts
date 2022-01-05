import { BigNumber } from 'ethers'
import { expect } from './expect'
import { Filename } from './filesystem'
import { BalanceBN } from '../models/BalanceBN'
import { AmountBN } from '../models/AmountBN'
import { sumBalances } from './balance'

export async function importExpectations(expectationsPath: Filename) {
  return (await import(`${process.cwd()}/${expectationsPath}`)).expectations
}

export function expectBalances(actualBalances: BalanceBN[], expectedBalances: BalanceBN[]) {
  for (const expectedBalance of expectedBalances) {
    const address = expectedBalance.address
    const actualBalance = actualBalances.find(b => b.address === address)
    const actualAmount = actualBalance?.amount ?? BigNumber.from('0')
    const expectedAmount = expectedBalance.amount
    expect(expectedAmount, `on address ${address}`).to.equal(actualAmount)
  }
}

export function expectTotalAmount(balances: BalanceBN[], expectedTotalAmount: AmountBN) {
  const actualTotalAmount = sumBalances(balances)
  expect(expectedTotalAmount).to.equal(actualTotalAmount)
  // expect(totalAmount.gt(expectedTotalAmount.min)).to.be.true
  // expect(totalAmount.lt(expectedTotalAmount.max)).to.be.true
}
