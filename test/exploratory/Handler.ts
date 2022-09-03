import { Filter } from '../../util/ensure'
import { Transition } from './Transition'
import { Step } from './Step'

export interface Handler<Params, State> {
  filter: Filter<Step<Params, State>>
  transition: Transition<Params, State>
}

export function handler<Params, State>(filter: Filter<Step<Params, State>>, transition: Transition<Params, State>): Handler<Params, State> {
  return { filter, transition }
}
