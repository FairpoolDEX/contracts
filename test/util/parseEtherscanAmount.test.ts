import { expect } from '../../util-local/expect'
import { fest } from '../../util-local/mocha'
import { parseEtherscanAmountCSV } from '../../models/AmountBN/parseEtherscanAmountCSV'
import { BigNumber } from 'ethers'

fest(parseEtherscanAmountCSV.name, async () => {
  expect(parseEtherscanAmountCSV(18, '1.0')).to.equal(BigNumber.from('1000000000000000000'))
  expect(parseEtherscanAmountCSV(18, '2,100.0')).to.equal(BigNumber.from('2100000000000000000000'))
  expect(parseEtherscanAmountCSV(18, '2,100.034')).to.equal(BigNumber.from('2100034000000000000000'))
})
