import { toTokenAmount } from '../support/all.helpers'
import { DeployColiExpectationsMap } from '../../tasks/deployColiTokenTask'
import { validateAddresses } from '../../models/Address'
import { getBalancesFromMap } from '../../util/balance'

export const expectations: DeployColiExpectationsMap = {
  equalBalances: validateAddresses([
    '0x7dcbefb3b9a12b58af8759e0eb8df05656db911d',
  ]),
  balances: getBalancesFromMap({
    '0xc77aab3c6d7dab46248f3cc3033c856171878bd5': toTokenAmount('0'),
  }),
}
