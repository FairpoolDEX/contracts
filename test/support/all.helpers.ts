import { utils, BigNumber } from "ethers"

export const toTokenAmount = (value: string | number): BigNumber => utils.parseUnits(typeof value === "number" ? value.toFixed(18) : value, "18")

export const fromTokenAmount = (value: BigNumber): number => parseFloat(utils.formatUnits(value, "18"))

export const toTokenAmountString = (value: string | number): string => toTokenAmount(value).toString()

export const days: number = 24 * 60 * 60

export function chunk(arr: any[], size: number): Array<Array<any>> {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}
