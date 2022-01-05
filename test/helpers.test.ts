import { expect } from '../util/expect'
import { toTokenAmount } from './support/all.helpers'
import Decimal from 'decimal.js'
import { BigNumber } from 'ethers'

it('toTokenAmount', async () => {
  expect(toTokenAmount(new Decimal(10.1))).to.equal(BigNumber.from('10100000000000000000'))
})

// it.only('BULL maxSupplyTokenAmount', async () => {
//   const expectedMaxSupply = maxSupply * Math.pow(10, 18)
//   expect(BigNumber.from(expectedMaxSupply).toString()).to.equal(maxSupplyTokenAmount.toString())
// })
