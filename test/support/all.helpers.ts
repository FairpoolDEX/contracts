import { BigNumber, utils } from "ethers"
import { Ethers } from "../../util/types"
import { DateTime } from "luxon"
import { DurationInput } from "luxon/src/duration"
import Decimal from "decimal.js"

export const toTokenAmount = (value: BigNumber | Decimal | string | number): BigNumber => {
  if (value instanceof Decimal) {
    return BigNumber.from(value.mul(new Decimal(10).pow(18)).toFixed(0))
  } else if (value instanceof BigNumber) {
    return value.mul(scale)
  } else {
    return utils.parseUnits(typeof value === "number" ? value.toFixed(18) : value, "18")
  }
}

export const fromTokenAmount = (value: BigNumber): number => parseFloat(utils.formatUnits(value, "18"))

export const toTokenAmountString = (value: string | number): string => toTokenAmount(value).toString()

export const MaxUint256 = BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")

export const scale = BigNumber.from(10).pow(18)

export function dateAdd(date: Date, duration: DurationInput) {
  return DateTime.fromJSDate(date).plus(duration).toJSDate()
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export async function mineBlocks(count: number, ethers: Ethers): Promise<void> {
  const network = await ethers.provider.getNetwork()
  if (network.chainId === 31337) {
    while (count--) {
      await ethers.provider.send("evm_mine", [])
    }
  }
}

export function sum(array: BigNumber[]) {
  return array.reduce((acc, bn) => acc.add(bn), BigNumber.from(0))
}

export const seconds = 1000

export const minutes = 60 * seconds

export const hours = 60 * minutes

export const days = 24 * hours

export const months = 30 * days // nominal, not calendar

export const years = 12 * months
