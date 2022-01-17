import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { BalancesMap, getBalancesFromMap } from '../../util/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { CS, deployer, KS } from '../../data/allAddresses'
import { mergeVersionedRecords } from '../../util/version'
import { expectBalancesToMatch, expectUnderTotalAmount } from '../../util/expectation'
import { airdropDistributedTokenAmountTotal } from '../support/BullToken.helpers'
import { share } from '../../util/bignumber'
import { WriteClaimsValidator } from '../../tasks/writeClaimsTask'

export const virtualSHLDBalancesFromCurrentBullBalances: BalancesMap = {
  [deployer]: toTokenAmount(new Decimal('7476830.847274140000000000')),
  [CS]: toTokenAmount(new Decimal('190314.565473847000000000')),
  [KS]: toTokenAmount(new Decimal('3495.240000000000000000')),
}

const { balances: oldBalances } = oldExpectations

const validateBalances: WriteClaimsValidator = async function (claims, context) {
  const expectedBalances = getBalancesFromMap(getRebrandBalances())
  return expectBalancesToMatch(expectedBalances, claims)
}

const validateTotalAmount: WriteClaimsValidator = async function (claims, context) {
  const expectedTotalAmount = airdropDistributedTokenAmountTotal
  const expectedTotalAmountDelta = share(expectedTotalAmount, 5, 100)
  // NOTE: It will take too much time to calculate the delta precisely
  // const bannedAddressesTokenAmount = todo(BigNumber.from(0))
  // const unclaimedTokenAmount = todo(BigNumber.from(0))
  return expectUnderTotalAmount(expectedTotalAmount, expectedTotalAmountDelta, claims)
}

export default [
  validateBalances,
  validateTotalAmount,
]

const getRebrandBalances = function (): BalancesMap {
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
