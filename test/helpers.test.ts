import { expect } from '../utils-local/expect'
import { toTokenAmount } from './support/all.helpers'
import Decimal from 'decimal.js'
import { BigNumber } from 'ethers'
import { getReleasePeriodsElapsed, releaseTime } from './support/ColiToken.helpers'
import { seconds } from '../utils-local/time'
import { fest } from '../utils-local/mocha'

fest('toTokenAmount', async () => {
  expect(toTokenAmount(new Decimal(10.1))).to.equal(BigNumber.from('10100000000000000000'))
})

// it.only('BULL maxSupplyTokenAmount', async () => {
//   const expectedMaxSupply = maxSupply * Math.pow(10, 18)
//   expect(BigNumber.from(expectedMaxSupply).toString()).to.equal(maxSupplyTokenAmount.toString())
// })

fest('getReleasePeriodsElapsed', async () => {
  expect(getReleasePeriodsElapsed(new Date(releaseTime * seconds))).to.equal(0)
  expect(getReleasePeriodsElapsed(new Date('2022-01-16'))).to.equal(8)
})
