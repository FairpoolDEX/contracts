import { cloneDeep } from 'lodash'

type Type = string

export interface FunctionDefinition {
  name: string
  types: Type[]
}

export interface Replacement {
  from: Type
  to: Type
}

export type ReplacementArr = [string, string]

export function getPolymorphicDefinitions(base: FunctionDefinition, replacementsArrays: ReplacementArr[][]) {
  return replacementsArrays.map(replacements => {
    const def = cloneDeep(base)
    def.types = def.types.map(type => {
      const replacement = replacements.find(r => r[0] === type)
      return replacement ? replacement[1] : type
    })
    return def
  })
}
