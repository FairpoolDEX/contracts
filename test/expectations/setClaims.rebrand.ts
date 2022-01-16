import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { maxSupplyTokenAmount as bullMaxSupplyTokenAmount } from '../support/BullToken.helpers'
import { SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { BalancesMap } from '../../util/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { merge } from 'lodash'
import { CS, deployer, KS } from '../../data/allAddresses'

export const virtualSHLDBalancesFromCurrentBullBalances: BalancesMap = {
  [deployer]: toTokenAmount(new Decimal('7476830.847274140000000000')),
  [CS]: toTokenAmount(new Decimal('190314.565473847000000000')),
  [KS]: toTokenAmount(new Decimal('3495.240000000000000000')),
}

const { balances: oldBalances } = oldExpectations

export const expectations: SetClaimsExpectationsMap = merge<Partial<SetClaimsExpectationsMap>, SetClaimsExpectationsMap, SetClaimsExpectationsMap>({}, oldExpectations, {
  balances: {
    [deployer]: oldBalances[deployer].add(virtualSHLDBalancesFromCurrentBullBalances[deployer]),
    [CS]: oldBalances[CS].add(virtualSHLDBalancesFromCurrentBullBalances[CS]),
    [KS]: oldBalances[KS].add(virtualSHLDBalancesFromCurrentBullBalances[KS]),
  },
  totalAmount: bullMaxSupplyTokenAmount,
})
