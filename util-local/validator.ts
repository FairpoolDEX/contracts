export type ContextualValidator<Val, Cont> = (value: Val, context: Cont) => Promise<Val>

export async function validateWithContext<Val, Cont>(value: Val, validators: ContextualValidator<Val, Cont>[], context: Cont) {
  return validators.reduce(async function (result, validator) {
    return validator(await result, context)
  }, Promise.resolve(value))
}
