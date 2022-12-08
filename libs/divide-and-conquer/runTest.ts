import { Transistor } from './Transistor'
import { mapAsync } from 'zenbox-util/promise'

export async function runTestWithTransistors<State>(transistors: Transistor<State>[], state: State) {
  return mapAsync(transistors, t => t(state))
}

export async function runTestWithPlans<State>(plans: Plan<State>[], state: State) {
  return mapAsync(plans, p => p.explore(plans, state))
}

export interface Plan<State> {
  explore: Explore<State>
}

export type Explore<State> = (plans: Plan<State>[], state: State) => Promise<void>
