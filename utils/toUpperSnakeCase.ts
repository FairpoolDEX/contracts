import { upperCase } from 'lodash'

export function toUpperSnakeCase(str: string) {
  return upperCase(str).replace(/\s/g, '_')
}
