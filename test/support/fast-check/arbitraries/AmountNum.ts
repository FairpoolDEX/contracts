import { nat } from 'fast-check'

export function amountNum(max?: number) {
  return nat({ max })
}
