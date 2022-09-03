import { BalancesMap } from '../../util-local/balance'
import { AmountBN } from '../../models/AmountBN'
import { Error as ErrorERC20EnumerableSimple, MintParams, TransferParams } from './ERC20Enumerable.simple.test'
import { GenericState } from '../exploratory/GenericState'
import { immutable, Transition } from '../exploratory/Transition'
import { $zero } from '../../data/allAddresses'
import { MaxUint256 } from '../support/all.helpers'
import { Address } from '../../models/Address'
import { zero } from '../../util/bignumber'
import { pull } from 'lodash'

export interface Data {
  totalSupply: AmountBN
  balances: BalancesMap,
  holders: Address[]
}

export type Output = undefined

export type Err = ErrorERC20EnumerableSimple

const { MathSubUnderflow, MathAddUnderflow, MathAddOverflow, TransferAmountExceedsBalance, MintToZeroAddress, TransferToZeroAddress, TransferFromZeroAddress } = ErrorERC20EnumerableSimple

type State = GenericState<Data, Output, Err>

const mintSuperHandler: Transition<MintParams, State> = (params) => immutable(async (state) => {
  const { to, amount } = params
  const { data: { totalSupply, balances, holders } } = state
  if (to === $zero) {
    return { error: MintToZeroAddress }
  }
  const totalSupplyNew = totalSupply.add(amount)
  if (totalSupplyNew.gt(MaxUint256)) {
    return { error: MathAddOverflow }
  }
  const amountOld = balances[to] || zero
  if (!amountOld.isZero()) {
    balances[to] = balances[to].add(amount)
    if (balances[to].gt(MaxUint256)) {
      return { error: MathAddOverflow }
    }
    // holders unchanged
    return { data: { balances, holders, totalSupply } }
  } else {
    balances[to] = amount
    holders.push(to)
    return { data: { balances, holders, totalSupply } }
  }
  return undefined
})

// const mintHandlers: Handler<MintParams, State>[] = [
//   handler(
//     ({ params: { to } }) => to === $zero,
//     emptyTransition
//   ),
//   handler(
//     ({ params: { amount }, state: { data: { totalSupply } } }) => totalSupply.add(amount).gt(MaxUint256),
//     emptyTransition
//   ),
//   handler(
//     ({ params: { to, amount }, state: { data: { balances } } }) => (balances[to] || zero).add(amount).gt(MaxUint256),
//     emptyTransition
//   ),
//   handler(
//     ({ params: { to, amount }, state: { data: { balances } } }) => (balances[to] || zero).add(amount).eq(amount),
//     emptyTransition
//   ),
//   handler(
//     ({ params: { to, amount }, state: { data: { balances } } }) => true,
//     emptyTransition
//   ),
// ]

const transferSuperHandler: Transition<TransferParams, State> = (params) => immutable(async (state) => {
  const { from, to, amount } = params
  const { data: { totalSupply, balances, holders } } = state
  if (from === $zero) {
    return { error: TransferFromZeroAddress }
  }
  if (to === $zero) {
    return { error: TransferToZeroAddress }
  }
  const amountFrom = balances[from] || zero
  const amountTo = balances[to] || zero
  if (!amountFrom.gte(amount)) {
    return { error: TransferAmountExceedsBalance }
  }
  // NOTE: How do we generate this condition?
  if (to === from) {
    return state
  }
  balances[from] = balances[from].sub(amount)
  if (balances[from].lt(MaxUint256)) {
    return { error: MathSubUnderflow }
  }
  if (balances[from].isZero()) {
    delete balances[from]
    pull(holders, from)
  }
  if (!amountTo.isZero()) {
    balances[to] = balances[to].add(amount)
    if (balances[to].gt(MaxUint256)) {
      return { error: MathAddOverflow }
    }
    // holders unchanged because amountTo is not zero
    return { data: { balances, holders, totalSupply } }
  } else {
    balances[to] = amount
    holders.push(to)
    return { data: { balances, holders, totalSupply } }
  }
  return undefined
})
