import { Random } from 'fast-check'
import { BalanceBN, balanceBN, validateBalancesBN } from '../../models/BalanceBN'
import { Transition } from '../../libs/divide-and-conquer/Transition'
import { Address } from '../../models/Address'
import { $zero } from '../../data/allAddresses'
import { step, Step } from '../../libs/divide-and-conquer/Step'
import { Projection } from '../../libs/divide-and-conquer/Projection'
import { address } from '../support/fast-check/arbitraries/Address'
import { get_getRandomValue, GetRandomValue } from '../../libs/divide-and-conquer/GetRandomValue'
import { cloneDeep, set } from 'lodash'
import { PropPath } from '../../libs/divide-and-conquer/PropPath'
import { uint256BN } from '../support/fast-check/arbitraries/AmountBN'
import { handler, Handler } from '../../libs/divide-and-conquer/Handler'
import { Filter } from '../../utils/ensure'
import { one, uint256Max, zero } from '../../libs/bn/constants'
import { ERC20EnumerableError, MintToZeroAddress } from './ERC20Enumerable.errors'
import { GenericState } from '../../libs/divide-and-conquer/models/GenericState'
import { BN } from '../../libs/bn'
import { todo } from '../../libs/utils/todo'
import prand from 'pure-rand'
import { Plan, runTestWithPlans } from '../../libs/divide-and-conquer/runTest'
import { runStepWithHandlers } from '../../libs/divide-and-conquer/runStepWithHandlers'
import { MintParams } from './ERC20Enumerable.params'
import { toGenericTransition } from '../../libs/divide-and-conquer/models/GenericState/toGenericTransition'

export interface Data {
  balances: BalanceBN[]
}

export type Output = undefined

export type Error = ERC20EnumerableError

export type State = GenericState<Data, Output, Error>

const emptyData: Data = { balances: [] }

const emptyOutput = undefined

const emptyError = undefined

export const emptyState: State = { data: emptyData, output: emptyOutput, error: emptyError }

const validateState: Filter<State> = (state) => {
  const mustHaveUniqueAddresses = validateBalancesBN
  mustHaveUniqueAddresses(state.data.balances)
  return true
}

export const getHolders: Projection<State, Address[]> = (state: State) => state.data.balances.map(b => b.address)

const emptyMintParams: MintParams = { to: $zero, amount: zero }

export const incorrectMintWithoutExistenceCheck: Transition<MintParams, State> = ({ to, amount }) => toGenericTransition(async ({ data: { balances } }) => {
  balances.push({
    address: to,
    amount,
  })
  return { data: { balances } }
})

export const mintHandlers: Handler<MintParams, State>[] = [
  handler(
    ({ params: { to } }) => to === $zero,
    ({ to, amount }) => toGenericTransition(async ({ data: { balances } }) => {
      return { error: new MintToZeroAddress() }
    })
  ),
  handler(
    ({ state: { data: { balances } } }) => balances.length === 0,
    ({ to, amount }) => toGenericTransition(async ({ data: { balances } }) => {
      balances.push({ address: to, amount })
      return { data: { balances } }
    })
  ),
  handler(
    ({ state: { data: { balances } }, params: { to } }) => balances.findIndex(b => b.address === to) != -1,
    ({ to, amount }) => toGenericTransition(async ({ data: { balances } }) => {
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

export const emptyMintStep: Step<MintParams, State> = {
  state: emptyState,
  params: emptyMintParams,
  transition: incorrectMintWithoutExistenceCheck,
}

async function doTest(random: Random) {
  const gen = get_getRandomValue(random)
  const steps = getStepsGen(gen)(emptyMintStep)
  // TODO: The next steps must be generated after exploring a specific state
}

export const getStaticMintParamsArray = (gen: GetRandomValue) => async (state: State) => {
  const randomAddress = gen(address())
  const randomAmount = gen(uint256BN())
  const option1: MintParams[] = [
    { to: $zero, amount: BN.from(0) },
    { to: $zero, amount: BN.from(0) },
    // address that is present in balances
    // address that is not present in balances
    // amount that is larger than uint256
    // TODO: one MintParams for each branch
  ]
  return todo<MintParams[]>()
}

const firstArgumentOfDescribe = async () => {
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
      await Promise.all(paramsArray.map(params => runStepWithHandlers(plans, handlers)(step(transition, params, state))))
    },
  }
  const burnPlan: Plan<State> = {
    explore: async (plans, state) => {
      return todo<undefined>()
    },
  }
  const transferPlan: Plan<State> = {
    explore: async (plans, state) => {
      return todo<undefined>()
    },
  }
  plans.push(mintPlan)
  plans.push(burnPlan)
  plans.push(transferPlan)
  return runTestWithPlans(plans, emptyState)
}
