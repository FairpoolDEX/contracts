import { BalanceBN } from '../../models/BalanceBN'
import { toTransition, Transition } from '../divide-and-conquer/Transition'
import { BigNumber } from 'ethers'
import { GenericState } from '../divide-and-conquer/GenericState'
import { Err } from './ERC20Enumerable.full.test'
import { bn } from '../../libs/bn/utils'
import { AmountBN } from '../../models/AmountBN'
import { BalancesMap } from '../../util-local/balance'
import { Address } from '../../models/Address'
import { stub } from '../../util/todo'
import { DeepPartial } from '../../util/typescript'
import { zero } from '../../libs/bn/constants'

type ConstantUint256 = BigNumber

type Uint256 = BigNumber

export interface Data {
  window: ConstantUint256
  index: Uint256
  balances: BalancesMap,
  holders: Address[]
}

export type Output = BalanceBN[]

export type Error = undefined

type State = GenericState<Data, Output, Err>

const WINDOW: ConstantUint256 = bn(100)

const emptyState: State = {
  data: { window: WINDOW, index: zero, balances: {}, holders: [] },
  output: [],
  error: undefined,
}

interface DistributeParams {
  profit: AmountBN
}

const distribute: Transition<DistributeParams, State> = (params) => toTransition(async (state) => {
  return stub<DeepPartial<State>>()
})
