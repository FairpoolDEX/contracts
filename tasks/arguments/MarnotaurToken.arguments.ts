import { BigNumber } from 'ethers'
import { ten } from '../../util/bignumber'

// https://github.com/platinum-engineering/MarnotaurToken/blob/main/contracts/MarnotaurToken.sol
export default ['Marnotaur Governance v1', 'TAUR', BigNumber.from('150000000').mul(ten.pow(18)), [], []]
