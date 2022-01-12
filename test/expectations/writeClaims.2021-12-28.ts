import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { bannedAddressesTokenAmount, distributedTokenAmount } from '../support/BullToken.helpers'
import { BalancesMap } from '../../util/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { merge } from 'lodash'
import { CryptStylo, deployer, winooze } from '../../data/allAddresses'
import { WriteClaimsExpectationsMap } from '../../tasks/writeClaimsTask'

export const virtualSHLDBalancesFromCurrentBullBalances: BalancesMap = {
  [deployer]: toTokenAmount(new Decimal('7476830.847274140000000000')),
  [CryptStylo]: toTokenAmount(new Decimal('190314.565473847000000000')),
  [winooze]: toTokenAmount(new Decimal('3495.240000000000000000')),
}

const { balances: oldBalances } = oldExpectations

export const expectations: WriteClaimsExpectationsMap = merge({}, oldExpectations, {
  balances: {
    [deployer]: oldBalances[deployer].add(virtualSHLDBalancesFromCurrentBullBalances[deployer]),
    [CryptStylo]: oldBalances[CryptStylo].add(virtualSHLDBalancesFromCurrentBullBalances[CryptStylo]),
    [winooze]: oldBalances[winooze].add(virtualSHLDBalancesFromCurrentBullBalances[winooze]),
  },
  totalAmount: distributedTokenAmount.sub(bannedAddressesTokenAmount),
})