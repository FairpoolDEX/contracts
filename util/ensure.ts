import { Task } from 'src/Generic/models/Task'

export type EnsureException = Task | Error

export function ensure<Obj>(object: Obj | null | undefined, exception: EnsureException = new Error('Can\'t find object in collection')) {
  if (object === null || object === undefined) throw exception
  return object
}