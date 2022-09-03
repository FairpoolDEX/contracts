import { TypeInfo } from './TypeInfo'

export interface Pivot<Type> {
  value: Type
  info: TypeInfo<Type>
}
