import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { BalancesMap } from '../../util/balance'
import { expectations as oldExpectations } from './setClaims.2021-08-03'
import { CS, deployer, KS } from '../../data/allAddresses'
import { WriteClaimsValidator } from '../../tasks/writeClaimsTask'
import { mergeVersionedRecords } from '../../util/version'
import { todo } from '../../util/todo'
import { BigNumber } from 'ethers'

export const virtualSHLDBalancesFromCurrentBullBalances: BalancesMap = {
  [deployer]: toTokenAmount(new Decimal('7476830.847274140000000000')),
  [CS]: toTokenAmount(new Decimal('190314.565473847000000000')),
  [KS]: toTokenAmount(new Decimal('3495.240000000000000000')),
}

const { balances: oldBalances } = oldExpectations

const validateBalances: WriteClaimsValidator = async function (claims, context) {
  return todo(claims)
}

const validateTotalAmount: WriteClaimsValidator = async function (claims, context) {
  // It will take too much time to implement this function
  const bannedAddressesTokenAmount = todo(BigNumber.from(0))
  const unclaimedTokenAmount = todo(BigNumber.from(0))
  // return airdropDistributedTokenAmountTotal.sub(bannedAddressesTokenAmount).sub(unclaimedTokenAmount)
  return todo(claims)
}

export default [
  validateBalances,
  validateTotalAmount,
]

function getRebrandBalances(): BalancesMap {
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
