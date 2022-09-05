import prand from 'pure-rand'
import { Random } from 'fast-check'
import { balanceBN, BalanceBN, validateBalancesBN } from '../../models/BalanceBN'
import { GenericState } from '../divide-and-conquer/GenericState'
import { toTransition, Transition } from '../divide-and-conquer/Transition'
import { Address } from '../../models/Address'
import { AmountBN } from '../../models/AmountBN'
import { $zero } from '../../data/allAddresses'
import { step, Step } from '../divide-and-conquer/Step'
import { Projection } from '../divide-and-conquer/Projection'
import { address } from '../support/fast-check/arbitraries/Address'
import { get_getRandomValue, GetRandomValue } from '../divide-and-conquer/GetRandomValue'
import { one, uint256Max, zero } from '../../util/bignumber'
import { cloneDeep, set } from 'lodash'
import { PropPath } from '../divide-and-conquer/PropPath'
import { uint256BN } from '../support/fast-check/arbitraries/AmountBN'
import { Plan, runTestWithPlans } from '../divide-and-conquer/runTest'
import { stub } from '../../util/todo'
import { parMap } from '../../util/promise'
import { runStepWithHandlers } from '../divide-and-conquer/runStepWithHandlers'
import { handler, Handler } from '../divide-and-conquer/Handler'
import { Filter } from '../../util/ensure'

export interface Data {
  balances: BalanceBN[]
}

export type Output = undefined

export enum Error {
  MathSubOverflow = 'Math: ds-math-sub-overflow',
  MathAddOverflow = 'Math: ds-math-add-overflow',
  MathSubUnderflow = 'Math: ds-math-sub-underflow',
  MathAddUnderflow = 'Math: ds-math-add-underflow',
  TransferFromZeroAddress = 'ERC20: transfer from the zero address',
  TransferToZeroAddress = 'ERC20: transfer to the zero address',
  TransferAmountExceedsBalance = 'ERC20: transfer amount exceeds balance',
  MintToZeroAddress = 'ERC20: mint to the zero address',
  BurnFromZeroAddress = 'ERC20: burn from the zero address',
  BurnAmountExceedsBalance = 'ERC20: burn amount exceeds balance'
}

type State = GenericState<Data, Output, Error>

const emptyData: Data = { balances: [] }

const emptyOutput = undefined

const emptyError = undefined

const emptyState: State = { data: emptyData, output: emptyOutput, error: emptyError }

const validateState: Filter<State> = (state) => {
  const mustHaveUniqueAddresses = validateBalancesBN
  mustHaveUniqueAddresses(state.data.balances)
  return true
}

export const getHolders: Projection<State, Address[]> = (state: State) => state.data.balances.map(b => b.address)

export type MintParams = { to: Address, amount: AmountBN }

export type TransferParams = { from: Address, to: Address, amount: AmountBN }

const emptyMintParams: MintParams = { to: $zero, amount: zero }

export const incorrectMintWithoutExistenceCheck: Transition<MintParams, State> = ({ to, amount }) => toTransition(async ({ data: { balances } }) => {
  balances.push({
    address: to,
    amount,
  })
  return { data: { balances } }
})

export const mintHandlers: Handler<MintParams, State>[] = [
  handler(
    ({ params: { to } }) => to === $zero,
    ({ to, amount }) => toTransition(async ({ data: { balances } }) => {
      return { error: Error.MintToZeroAddress }
    })
  ),
  handler(
    ({ state: { data: { balances } } }) => balances.length === 0,
    ({ to, amount }) => toTransition(async ({ data: { balances } }) => {
      balances.push({ address: to, amount })
      return { data: { balances } }
    })
  ),
  // code duplication
  handler(
    ({ state: { data: { balances } }, params: { to } }) => balances.findIndex(b => b.address === to) != -1,
    ({ to, amount }) => toTransition(async ({ data: { balances } }) => {
      const index = balances.findIndex(b => b.address === to)
      balances[index].amount = balances[index].amount.add(amount)
      return { data: { balances } }
    })
  ),
]

const getStepsFromValues = (path: PropPath) => <Value>(values: Value[]) => <Params, State>(base: Step<Params, State>) => {
  return values.map(value => {
    return set(cloneDeep(base), path, value)
  })
}

const getStepsGen = (gen: GetRandomValue) => <Params, State>(base: Step<Params, State>) => {
  const randomAddress = gen(address())
  const randomAmount = gen(uint256BN())
  const path: PropPath = 'params.to'
  const addresses: Address[] = [$zero, randomAddress]
  const amounts = [zero, one, uint256Max, randomAmount]
  const balances = [
    [],
    [
      balanceBN($zero, zero), // invalid state, must not be reachable
    ],
    [
      balanceBN(randomAddress, randomAmount), // equality relationships
    ],
    [
      balanceBN(randomAddress, randomAmount.add(one)), // lte relationship
    ],
    // TODO
  ]
  const statesTo = getStepsFromValues(path)(addresses)(base)
  // return statesTo.flatMap()
  return statesTo
}

const emptyMintStep: Step<MintParams, State> = {
  state: emptyState,
  params: emptyMintParams,
  transition: incorrectMintWithoutExistenceCheck,
}

async function doTest(random: Random) {
  const gen = get_getRandomValue(random)
  const steps = getStepsGen(gen)(emptyMintStep)
  // TODO: The next steps must be generated after exploring a specific state
}

// async function getPivots(state: State) {
//   const { data } = state
//   const balancesPivot: Pivot =
//   return [
//     balancesPivot
//   ]
// }

const getStaticMintParamsArray = (gen: GetRandomValue) => async (state: State) => {
  const randomAddress = gen(address())
  const randomAmount = gen(uint256BN())
  const option1: MintParams[] = [
    { to: $zero, amount: zero },
    { to: $zero, amount: zero },
    // address that is present in balances
    // address that is not present in balances
    // amount that is larger than uint256
    // TODO: one MintParams for each branch
  ]
  return stub<MintParams[]>()
}

describe('ERC20Enumerable.simple', async () => {
  const random = new Random(prand.xoroshiro128plus(Date.now()))
  const gen = get_getRandomValue(random)
  const plans: Plan<State>[] = []
  const mintPlan: Plan<State> = {
    explore: async (plans, state) => {
      // generate params to trigger each branch
      const paramsArray = await getStaticMintParamsArray(gen)(state)
      const handlers = mintHandlers
      const transition = incorrectMintWithoutExistenceCheck
      // TODO: if state has changed then explore again, else stop
      await parMap(paramsArray, params => runStepWithHandlers(plans, handlers)(step(transition, params, state)))
    },
  }
  const burnPlan: Plan<State> = {
    explore: async (plans, state) => {
      return stub<undefined>()
    },
  }
  const transferPlan: Plan<State> = {
    explore: async (plans, state) => {
      return stub<undefined>()
    },
  }
  plans.push(mintPlan)
  plans.push(burnPlan)
  plans.push(transferPlan)
  return runTestWithPlans(plans, emptyState)
})

const mintBranches = [

]
