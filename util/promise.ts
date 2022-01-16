export async function seqMap<In, Out, Args extends unknown[]>(values: In[], mapper: (value: In, ...args: Args) => Promise<Out>, ...args: Args) {
  const results: Out[] = []
  for (const value of values) {
    results.push(await mapper(value, ...args))
  }
  return results
}

export async function allMap<In, Out, Args extends unknown[]>(values: In[], mapper: (value: In, ...args: Args) => Promise<Out>, ...args: Args) {
  return Promise.all(values.map(value => mapper(value, ...args)))
}
