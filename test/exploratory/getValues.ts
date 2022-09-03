import { cloneDeep } from 'lodash'

export type GetValues<Type> = (pivot: Type) => Type[]

export const getValuesOfInductive = <Type>(base: Type, next: (value: Type) => Type) => (pivot: Type) => [base, next(base), pivot, next(pivot)]

export const getValuesOfRange = <Type>(min: Type, max: Type) => (pivot: Type) => cloneDeep([min, pivot, max])

export const getValuesOfEnum = <Type>(values: Type[]) => (pivot: Type) => cloneDeep([pivot, ...values])
