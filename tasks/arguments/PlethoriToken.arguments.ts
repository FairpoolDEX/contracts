import { BigNumber } from 'ethers'
import { ten } from '../../test/support/test.helpers'

// https://etherscan.io/address/0x3873965e73d9a21f88e645ce40b7db187fde4931#code
export default ['PLEToken', 'PLE', BigNumber.from('100000000').mul(ten.pow(18)), [], []]
