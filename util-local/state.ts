const chain = <State, Inputs extends unknown[], Outputs extends unknown[]>(state: State, ...inputsArr: Inputs[]) => (func: (state: State, ...input: Inputs) => [State, ...Outputs]) => {
  return inputsArr.reduce((state, inputs) => {
    const [stateNew] = func(state, ...inputs)
    return stateNew
  }, state)
}
