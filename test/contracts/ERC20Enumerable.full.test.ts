import { BalancesMap } from '../../util-local/balance'
import { AmountBN } from '../../models/AmountBN'
import { Error as ErrorERC20EnumerableSimple, MintParams, TransferParams } from './ERC20Enumerable.simple.test'
import { GenericState } from '../../libs/divide-and-conquer/GenericState'
import { toTransition, Transition } from '../../libs/divide-and-conquer/Transition'
import { $zero } from '../../data/allAddresses'
import { MaxUint256 } from '../support/all.helpers'
import { Address } from '../../models/Address'
import { concat, pull } from 'lodash'
import { FunctionDefinition, getPolymorphicDefinitions } from '../../libs/divide-and-conquer/FunctionDefinition'
import { eq, neq } from '../../libs/divide-and-conquer/allFunctionDefinitions'
import { zero } from '../../libs/bn/constants'

export interface Data {
  totalSupply: AmountBN
  balances: BalancesMap,
  holders: Address[]
}

export type Output = undefined

export type Error = ErrorERC20EnumerableSimple

const { MathSubUnderflow, MathAddUnderflow, MathAddOverflow, TransferAmountExceedsBalance, MintToZeroAddress, TransferToZeroAddress, TransferFromZeroAddress } = ErrorERC20EnumerableSimple

type State = GenericState<Data, Output, Error>

const constants = [
  { value: '0', type: 'Uint256' },
  { value: 'address(0)', type: 'Address' },
]

// TODO: Encode Beneficiary type
const allTypes = ['Address', 'Uint256', 'Mapping Address Uint256', 'List Address', 'Beneficiary', 'List Beneficiary']

const functions: FunctionDefinition[] = concat(
  getPolymorphicDefinitions(eq, [
    [['A', 'Address']],
  ]),
  getPolymorphicDefinitions(neq, [
    [['A', 'Address']],
  ])
)

const mint: Transition<MintParams, State> = (params) => toTransition(async (state) => {
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

const transferSuperHandler: Transition<TransferParams, State> = (params) => toTransition(async (state) => {
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
