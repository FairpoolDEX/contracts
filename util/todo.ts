export function todo<V>(value: V, message?: string): V {
  return value
}

export function stub<V>(message?: string): V {
  throw impl(message)
}

export function impl(message?: string) {
  return new ImplementationError(message || 'Implement me')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function manual<Key extends keyof any, Value>(map: Record<Key, Value>, key: Key, message?: string): Value {
  const value = map[key]
  if (!value) throw impl(message)
  return value
}

export class ImplementationError extends Error {

}
