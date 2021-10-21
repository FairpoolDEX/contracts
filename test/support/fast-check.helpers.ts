import { bigUintN, nat } from "fast-check"
import { BigNumber } from "ethers"

export function amountNum(max?: number) {
  return nat({ max })
}

export function amountBn(max?: number) {
  return amountNum(max).map(BigNumber.from)
}
