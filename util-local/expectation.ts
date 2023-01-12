import { BigNumber } from 'ethers'
import { expect } from './expect'
import { BalanceBN } from '../models/BalanceBN'
import { AmountBN } from '../models/AmountBN'
import { getAbsoluteFilename } from './import'
import { sumAmountBNs } from '../libs/ethereum/models/AmountBN/sumAmountBNs'
import { Filename } from '../libs/utils/filesystem'

export async function importExpectations(filename: Filename) {
  return (await import(getAbsoluteFilename(filename))).expectations
}

export function expectBalancesToMatch(expectedBalances: BalanceBN[], actualBalances: BalanceBN[]) {
  for (const expectedBalance of expectedBalances) {
    const address = expectedBalance.address
    const actualBalance = actualBalances.find(b => b.address === address)
    const actualAmount = actualBalance?.amount ?? BigNumber.from('0')
    const expectedAmount = expectedBalance.amount
    expect(expectedAmount, `on address ${address}`).to.equal(actualAmount)
  }
  return actualBalances
}

export function expectTotalAmount(expectedTotalAmount: AmountBN, balances: BalanceBN[]) {
  expect(expectedTotalAmount).to.equal(sumAmountBNs(balances))
  // expect(totalAmount.gt(expectedTotalAmount.min)).to.be.true
  // expect(totalAmount.lt(expectedTotalAmount.max)).to.be.true
}

export function expectUnderTotalAmount(expectedTotalAmount: AmountBN, delta: AmountBN, balances: BalanceBN[]) {
  const actualTotalAmount = sumAmountBNs(balances)
  expect(expectedTotalAmount).to.be.gte(actualTotalAmount)
  expect(expectedTotalAmount.sub(delta)).to.be.lte(actualTotalAmount)
  return balances
}

export interface Expected {
  expectations: Filename
}
