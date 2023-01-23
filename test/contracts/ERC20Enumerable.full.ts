import { BalancesMap } from '../../utils-local/balance'
import { AmountBN } from '../../models/AmountBN'
import { GenericState } from '../../libs/divide-and-conquer/models/GenericState'
import { Transition } from '../../libs/divide-and-conquer/Transition'
import { $zero } from '../../data/allAddresses'
import { Address } from '../../models/Address'
import { concat, pull } from 'lodash'
import { FunctionDefinition, getPolymorphicDefinitions } from '../../libs/divide-and-conquer/FunctionDefinition'
import { eq, neq } from '../../libs/divide-and-conquer/allFunctionDefinitions'
import { zero } from '../../libs/bn/constants'
import { ERC20EnumerableError, MintToZeroAddress, TransferAmountExceedsBalance, TransferFromZeroAddress, TransferToZeroAddress } from './ERC20Enumerable.errors'
import { MintParams, TransferParams } from './ERC20Enumerable.params'
import { addUint, subUint } from '../../libs/ethereum/math'
import { toGenericTransition } from '../../libs/divide-and-conquer/models/GenericState/toGenericTransition'

export interface Data {
  totalSupply: AmountBN
  balances: BalancesMap,
  holders: Address[]
}

export type Output = undefined

export type Error = ERC20EnumerableError

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

const mint: Transition<MintParams, State> = (params) => toGenericTransition(async (state) => {
  const { to, amount } = params
  const { data: { totalSupply, balances, holders } } = state
  if (to === $zero) throw new MintToZeroAddress()
  const totalSupplyNew = addUint(totalSupply, amount)
  const amountOld = balances[to] || zero
  if (amountOld.isZero()) {
    balances[to] = amount
    holders.push(to)
    return { data: { balances, holders, totalSupply } }
  } else {
    balances[to] = addUint(balances[to], amount)
    // holders unchanged
    return { data: { balances, holders, totalSupply } }
  }
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

const transferSuperHandler: Transition<TransferParams, State> = (params) => toGenericTransition(async (state) => {
  const { from, to, amount } = params
  const { data: { totalSupply, balances, holders } } = state
  if (from === $zero) throw new TransferFromZeroAddress()
  if (to === $zero) throw new TransferToZeroAddress()
  const amountFrom = balances[from] || zero
  const amountTo = balances[to] || zero
  if (!amountFrom.gte(amount)) throw new TransferAmountExceedsBalance()
  // NOTE: How do we generate this condition?
  if (to === from) {
    return state
  }
  balances[from] = subUint(balances[from], amount)
  if (balances[from].isZero()) {
    delete balances[from]
    pull(holders, from)
  }
  if (amountTo.isZero()) {
    balances[to] = amount
    holders.push(to)
  } else {
    balances[to] = addUint(balances[to], amount)
    // holders unchanged because amountTo is not zero
  }
  return { data: { balances, holders, totalSupply } }
})

// describe('ERC20Enumerable.full', async () => {
//   // required for mocha
//
//   fest('dummy test', async () => {
//   })
// })
