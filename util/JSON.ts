export function stringify(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function stringifyError(error: Error) {
  return JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
}
