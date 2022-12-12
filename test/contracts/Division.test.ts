import { GenericState } from '../../libs/divide-and-conquer/GenericState'
import { Transition } from '../../libs/divide-and-conquer/Transition'
import { cloneDeep } from 'lodash'
import { variator } from '../../libs/divide-and-conquer/Variator'
import { getJavascriptIntegers } from '../../libs/divide-and-conquer/generators/getJavascriptIntegers'
import { Step } from '../../libs/divide-and-conquer/Step'
import { handler, Handler } from '../../libs/divide-and-conquer/Handler'
import { todo } from 'libs/utils/todo'

interface Data {
  a: number
  b: number
}

type Out = number

type Err = DivisionByZero

class DivisionByZero extends Error {}

type DivideState = GenericState<Data, Out, Err>

const emptyData: Data = { a: 0, b: 0 }

const emptyOutput = undefined

const emptyError = undefined

const emptyState: DivideState = { data: emptyData, output: emptyOutput, error: emptyError }

export type SetAParams = { value: number }

export type SetBParams = { value: number }

export type DivideParams = undefined

export const setA: Transition<SetAParams, DivideState> = (params) => async ($state) => {
  const state = cloneDeep($state)
  state.data.a = params.value
  return state
}

export const setB: Transition<SetAParams, DivideState> = (params) => async ($state) => {
  const state = cloneDeep($state)
  state.data.b = params.value
  return state
}

export const divide: Transition<DivideParams, DivideState> = (params) => async ($state) => {
  const state = cloneDeep($state)
  if (state.data.b === 0) {
    state.error = new DivisionByZero()
  } else {
    state.output = state.data.a / state.data.b
  }
  return state
}

const transitions = [
  setA,
  setB,
  divide,
]

// async function runTransistor<Params, State>(transistor: TransistorOld<Params, State>, handlers: Handler<Params, State>[], state: State) {
//   const { transition, getParamsArray } = transistor
//   const paramsArr = await getParamsArray(state)
//   return parMap(paramsArr, params => runStep(handlers)({ transition, params, state }))
// }

// const getParamsArrayForSetA: GetParamsArray<SetAParams, DivideState> = async (state) => {
//   const { data } = state
//   const pivots = [
//     data.a,
//     data.b,
//   ]
//   const variators = [
//     variator('value', getJavascriptIntegers),
//   ]
//   const setters = await getVariations(variators, pivots)
// }
//
// const transistors = [
//   getTransistor<SetAParams, DivideState>({
//     transition: setA,
//     getParamsArray: getParamsArrayForSetA,
//   }),
// ]

describe('Division', async () => {
  test('divide', async () => {
    // every array of handlers must have a default handler that always executes
    const handlers: Handler<DivideParams, DivideState>[] = [
      handler((step) => step.state.data.b === 0, (params) => async ($state) => {
        const state = cloneDeep($state)
        state.error = new DivisionByZero()
        return state
      }),
      handler(() => true, (params) => async ($state) => {
        const state = cloneDeep($state)
        state.output = state.data.a / state.data.b
        return state
      }),
    ]
  })
  // TODO:
  // return runTest(transistors, emptyState)
})

async function getStepsForSetAParamsAndState() {
  const variators = [
    variator('state.data.a', getJavascriptIntegers),
    variator('state.data.b', getJavascriptIntegers),
    variator('params.value', getJavascriptIntegers),
  ]

  return todo<Step<SetAParams, DivideState>[]>()
}
