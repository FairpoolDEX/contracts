import { merge } from 'rambdax/immutable'
import { Partial } from 'ts-toolbelt/out/Object/Partial'
import { clone } from 'rambdax'
import { GenericState } from './GenericState'

export type TransitionBase<State> = (state: State) => Promise<State | undefined>

export type Transition<Params, State> = (params: Params) => TransitionBase<State>

export const emptyTransition = <Params, State>(params: Params) => async (state: State) => state

// // If the partial transition returns undefined, then it couldn't handle this step
// export type PartialTransition<Params, State> = (params: Params) => (state: State) => Promise<State | undefined>

// eslint-disable-next-line @typescript-eslint/ban-types
export type Update<State extends object> = (state: Readonly<State>) => Promise<Partial<State, 'deep'> | undefined>

// eslint-disable-next-line @typescript-eslint/ban-types
export function toGenericTransition<Data, Out, Err extends Error>(update: Update<GenericState<Data, Out, Err>>) {
  return async (state: GenericState<Data, Out, Err>) => {
    try {
      // clone is required because the update function may mutate the argument
      const patch = await update(clone(state))
      return patch ? merge(state, patch) : state
    } catch (error) {
      // error handling via try-catch is required because we don't want to check for error return values (and we don't have monads)
      if (error instanceof Error) {
        return merge(state, { error })
      } else {
        throw error
      }
    }
  }
}
