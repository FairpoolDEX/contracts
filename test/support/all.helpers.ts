import { utils, BigNumber } from "ethers"

export const toTokenAmount = (value: string | number): BigNumber => utils.parseUnits(typeof value === "number" ? value.toString() : value, "18")

export const fromTokenAmount = (value: BigNumber): number => parseFloat(utils.formatUnits(value, "18"))

export const days: number = 24 * 60 * 60
