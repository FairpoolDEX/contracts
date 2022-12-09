import { Handler } from './Handler'
import { Step } from './Step'
import { Transition } from './Transition'
import { Plan, runTestWithPlans } from './runTest'
import { equals } from 'rambdax'
import { impl } from '../utils/todo'
import { stringify } from '../utils/JSON'
import { expectEqualResults } from '../utils/chai/expectEqualResults'

const expectEqualResultsTest = expectEqualResults('Actual', 'Expected')

export const runStepWithHandlers = <Params, State>(plans: Plan<State>[], handlers: Handler<Params, State>[]) => async (step: Step<Params, State>) => {
  const stepAsString = stringify(step)
  const handler = handlers.find(h => h.filter(step))
  if (handler) {
    const { transition: transitionOriginal, state, params } = step
    const { transition: transitionSimple } = handler
    const stateNew = await expectEqualResultsTest(
      transitionOriginal(params)(state),
      transitionSimple(params)(state)
    )
    if (stateNew && !equals(stateNew, state)) {
      return runTestWithPlans(plans, stateNew)
    }
  } else {
    throw new Error(`Can't find handler for step ${stepAsString}`)
  }
}

/**
 * Stop: we need separate handler.filter & handler.transition functions because we need to find a handler synchronously
 */
export const runStepWithPartials = <Params, State>(partials: Transition<Params, State>[]) => async (step: Step<Params, State>) => {
  throw impl()
}
