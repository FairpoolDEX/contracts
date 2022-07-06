import { Contract } from 'ethers'
import { BalanceBN } from '../models/BalanceBN'
import { getERC20Balances } from '../test/support/ERC20.helpers'
import { expect } from './expect'

export async function expectBalancesOnToken(token: Contract, expectedBalances: BalanceBN[]) {
  const addresses = expectedBalances.map(b => b.address)
  const actualBalances = await getERC20Balances(token, addresses)
  expect(expectedBalances).to.deep.equal(actualBalances)
}
