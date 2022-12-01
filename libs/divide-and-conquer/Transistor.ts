import { Transition } from './Transition'
import { GetParamsArray } from './getParamsArray'
import { Handler } from './Handler'

export type Transistor<State> = (state: State) => Promise<State[]>

export const getTransistor = <Params, State>(transistor: TransistorOld<Params, State>, handlers: Handler<Params, State>[]) => async (state: State) => {
  const { transition, getParamsArray } = transistor
  const paramsArr = await getParamsArray(state)
  // TODO: add plans
  // return parMap(paramsArr, params => runStepWithHandlers(handlers)({ transition, params, state }))
}

export interface TransistorOld<Params, State> {
  transition: Transition<Params, State>
  getParamsArray: GetParamsArray<Params, State>
}
