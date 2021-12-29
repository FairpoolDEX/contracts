import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { maxSupplyTokenAmount as shieldMaxSupplyTokenAmount } from '../support/ShieldToken.helpers'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from '../support/BullToken.helpers'
import { SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { BalanceMap } from '../../util/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { merge } from 'lodash'
import { CryptStylo, deployer, winooze } from '../../data/allAddresses'

export const virtualSHLDBalancesFromCurrentBullBalances: BalanceMap = {
  [deployer]: toTokenAmount(new Decimal('7476830.847274140000000000')),
  [CryptStylo]: toTokenAmount(new Decimal('190314.565473847000000000')),
  [winooze]: toTokenAmount(new Decimal('3495.240000000000000000')),
}

const { balances: oldBalances } = oldExpectations

export const expectations: SetClaimsExpectationsMap = merge({}, oldExpectations, {
  balances: {
    [deployer]: oldBalances[deployer].add(virtualSHLDBalancesFromCurrentBullBalances[deployer]),
    [CryptStylo]: oldBalances[CryptStylo].add(virtualSHLDBalancesFromCurrentBullBalances[CryptStylo]),
    [winooze]: oldBalances[winooze].add(virtualSHLDBalancesFromCurrentBullBalances[winooze]),
  },
  totalSHLDAmount: {
    min: shieldMaxSupplyTokenAmount.mul(3),
    max: shieldMaxSupplyTokenAmount.mul(5),
  },
  totalBULLAmount: {
    min: shieldMaxSupplyTokenAmount.mul(airdropRate).mul(airdropStageShareNumerator).div(airdropStageShareDenominator),
    max: shieldMaxSupplyTokenAmount.mul(airdropRate),
  },
})
