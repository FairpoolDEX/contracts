import { cloneDeep, merge } from 'lodash'
import { DeepPartial } from '../../util/typescript'

export type TransitionBase<State> = (state: State) => Promise<State | undefined>

export type Transition<Params, State> = (params: Params) => TransitionBase<State>

export const emptyTransition = <Params, State>(params: Params) => async (state: State) => state

// // If the partial transition returns undefined, then it couldn't handle this step
// export type PartialTransition<Params, State> = (params: Params) => (state: State) => Promise<State | undefined>

export type Update<State> = (state: State) => Promise<DeepPartial<State> | undefined>

export function toTransition<State>(update: Update<State>) {
  return async ($state: State) => {
    const state = cloneDeep($state)
    const patch = await update(state)
    if (patch) return merge(state, patch)
  }
}
