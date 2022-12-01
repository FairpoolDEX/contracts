import { Transition } from './Transition'

export interface Step<Params, State> {
  transition: Transition<Params, State>
  params: Params
  state: State
}

export function step<Params, State>(transition: Transition<Params, State>, params: Params, state: State) {
  return { transition, params, state }
}

type Steps<Params, State> = Step<Params, State>[]

export const expectStepsWithOptimalCoverage = <Params, State>(steps: Steps<Params, State>) => {
  // mustNotContainDuplicates(steps)
  // mustContainAllPermutationsOfRelationshipsBetweenVars(steps)
  return steps
}

const isEqual = <T>(a: T, b: T) => a === b

const isLessThan = <T>(a: T, b: T) => a < b

const isGreaterThan = <T>(a: T, b: T) => a > b
