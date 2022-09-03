import { GetValues } from './getValues'

export interface Variator<Type> {
  path: string // property path in the object
  getValues: GetValues<Type>
}

export function variator<Type>(path: string, getValues: GetValues<Type>) {
  return { path, getValues }
}
