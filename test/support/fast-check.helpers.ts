import { bigUintN, nat } from "fast-check"
import { BigNumber } from "ethers"

export function amount(max?: number) {
  return nat({ max }).map(BigNumber.from)
}
