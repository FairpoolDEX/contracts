import { expect } from '../../utils-local/expect'
import { padAmount } from '../../utils-local/balance'
import { fest } from '../../utils-local/mocha'

fest(padAmount.name, async () => {
  expect(padAmount(18, '1.0')).to.equal('1.000000000000000000')
  expect(padAmount(18, '1.123')).to.equal('1.123000000000000000')
  expect(padAmount(18, '1.123000')).to.equal('1.123000000000000000')
  expect(padAmount(20, '1.0')).to.equal('1.00000000000000000000')
})
