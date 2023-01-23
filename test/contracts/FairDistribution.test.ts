import { BalanceBN } from '../../models/BalanceBN'
import { Transition } from '../../libs/divide-and-conquer/Transition'
import { BigNumber } from 'ethers'
import { GenericState } from '../../libs/divide-and-conquer/models/GenericState'
import { bn } from '../../libs/bn/utils'
import { AmountBN } from '../../models/AmountBN'
import { BalancesMap } from '../../utils-local/balance'
import { Address } from '../../models/Address'
import { zero } from '../../libs/bn/constants'
import { todo } from 'libs/utils/todo'
import { toGenericTransition } from '../../libs/divide-and-conquer/models/GenericState/toGenericTransition'

type ConstantUint256 = BigNumber

type Uint256 = BigNumber

export interface Data {
  window: ConstantUint256
  index: Uint256
  balances: BalancesMap,
  holders: Address[]
}

export type Output = BalanceBN[]

export type Err = Error

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

const distribute: Transition<DistributeParams, State> = (params) => toGenericTransition(async (state) => {
  return todo()
})
