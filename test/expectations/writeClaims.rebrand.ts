import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { bannedAddressesTokenAmount, distributedTokenAmount } from '../support/BullToken.helpers'
import { BalancesMap } from '../../util/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { CS, deployer, KS } from '../../data/allAddresses'
import { WriteClaimsExpectationsMap } from '../../tasks/writeClaimsTask'
import { mergeVersionedRecords } from '../../util/version'

export const virtualSHLDBalancesFromCurrentBullBalances: BalancesMap = {
  [deployer]: toTokenAmount(new Decimal('7476830.847274140000000000')),
  [CS]: toTokenAmount(new Decimal('190314.565473847000000000')),
  [KS]: toTokenAmount(new Decimal('3495.240000000000000000')),
}

const { balances: oldBalances } = oldExpectations

export const expectations: WriteClaimsExpectationsMap = {
  balances: getBalances(),
  totalAmount: distributedTokenAmount.sub(bannedAddressesTokenAmount),
}

function getBalances(): BalancesMap {
  return mergeVersionedRecords([
    ['1.0.1', {
      [KS]: oldBalances[KS].add(virtualSHLDBalancesFromCurrentBullBalances[KS]),
    }],
    ['1.0.2', {
      [CS]: oldBalances[CS].add(virtualSHLDBalancesFromCurrentBullBalances[CS]),
    }],
    ['1.1.0', {
      [deployer]: oldBalances[deployer].add(virtualSHLDBalancesFromCurrentBullBalances[deployer]),
    }],
  ])
}
