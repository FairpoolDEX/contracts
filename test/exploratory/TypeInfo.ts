export interface InductiveTypeInfo<Type> {
  isInductive: true
  base: Type
  next: (value: Type) => Type
}

export interface RangeTypeInfo<Type> {
  isRange: true
  min: Type
  max: Type
}

export interface EnumTypeInfo<Type> {
  isEnum: true
  values: Type[]
}

export type TypeInfo<Type> = InductiveTypeInfo<Type> | RangeTypeInfo<Type> | EnumTypeInfo<Type>
