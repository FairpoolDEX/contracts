export const not = <Val>(filter: (value: Val) => boolean) => (value: Val) => !filter(value)
