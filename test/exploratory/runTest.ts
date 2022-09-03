import { Transistor } from './Transistor'
import { parMap } from '../../util/promise'

export async function runTestWithTransistors<State>(transistors: Transistor<State>[], state: State) {
  return parMap(transistors, t => t(state))
}

export async function runTestWithPlans<State>(plans: Plan<State>[], state: State) {
  return parMap(plans, p => p.explore(plans, state))
}

export interface Plan<State> {
  explore: Explore<State>
}

export type Explore<State> = (plans: Plan<State>[], state: State) => Promise<void>
