import { clone } from 'rambdax'

export type GetValues<Type> = (pivot: Type) => Type[]

export const getValuesOfInductive = <Type>(base: Type, next: (value: Type) => Type) => (pivot: Type) => [base, next(base), pivot, next(pivot)]

export const getValuesOfRange = <Type>(min: Type, max: Type) => (pivot: Type) => clone([min, pivot, max])

export const getValuesOfEnum = <Type>(values: Type[]) => (pivot: Type) => clone([pivot, ...values])
