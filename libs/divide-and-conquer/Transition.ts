import { merge } from 'rambdax/immutable'
import { Partial } from 'ts-toolbelt/out/Object/Partial'

export type TransitionBase<State> = (state: State) => Promise<State | undefined>

export type Transition<Params, State> = (params: Params) => TransitionBase<State>

export const emptyTransition = <Params, State>(params: Params) => async (state: State) => state

// // If the partial transition returns undefined, then it couldn't handle this step
// export type PartialTransition<Params, State> = (params: Params) => (state: State) => Promise<State | undefined>

// eslint-disable-next-line @typescript-eslint/ban-types
export type Update<State extends object> = (state: Readonly<State>) => Promise<Partial<State, 'deep'> | undefined>

// eslint-disable-next-line @typescript-eslint/ban-types
export function toTransition<State extends object>(update: Update<State>) {
  return async (state: State) => {
    const patch = await update(state)
    return patch ? merge(state, patch) : state
  }
}
