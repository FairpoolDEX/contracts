import { expect } from './expect'
import { padAmount } from './balance'

it('should padAmount correctly', async () => {
  expect(padAmount('1.0', 18)).to.equal('1.000000000000000000')
  expect(padAmount('1.123', 18)).to.equal('1.123000000000000000')
  expect(padAmount('1.123000', 18)).to.equal('1.123000000000000000')
  expect(padAmount('1.0', 20)).to.equal('1.00000000000000000000')
})
