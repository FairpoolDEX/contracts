import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { BalancesMap, getBalancesFromMap, sumAmountsOf } from '../../util/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { CS, deployer, KS } from '../../data/allAddresses'
import { mergeVersionedRecords } from '../../util/version'
import { expectBalancesToMatch, expectUnderTotalAmount } from '../../util/expectation'
import { airdropDistributedTokenAmountTotal, fromShieldToBull } from '../support/BullToken.helpers'
import { share, sumBigNumbers } from '../../util/bignumber'
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
      [KS]: getKSBalance(),
    }],
    ['1.0.2', {
      [CS]: oldBalances[CS].add(virtualSHLDBalancesFromCurrentBullBalances[CS]),
    }],
    ['1.1.0', {
      [deployer]: oldBalances[deployer].add(virtualSHLDBalancesFromCurrentBullBalances[deployer]),
    }],
  ])
}

function getKSBalance() {
  const transfer19418 = ({ amount: toTokenAmount(19418), createdAt: 'May-27-2021 02:18:15 AM' })
  const transfer66750 = ({ amount: toTokenAmount(66750), createdAt: 'Aug-19-2021 06:00:24 AM' })
  const transfer56700 = ({ amount: toTokenAmount(56700), createdAt: 'Sep-02-2021 11:17:02 AM' })
  const balancesAtDistributionDates = [
    sumAmountsOf([transfer19418]),
    sumAmountsOf([transfer19418]),
    sumAmountsOf([transfer19418]),
    sumAmountsOf([transfer19418, transfer66750, transfer56700]),
    sumAmountsOf([transfer19418, transfer66750, transfer56700]),
  ]
  return fromShieldToBull(sumBigNumbers(balancesAtDistributionDates))
}
