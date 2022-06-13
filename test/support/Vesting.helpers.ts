import { BigNumber, BigNumberish } from 'ethers'
import { share } from '../../models/Share'
import { strict as assert } from 'assert'
import { toSeconds } from '../../models/Duration'
import { VestingType } from '../../models/VestingType'
import { GenericTokenWithVesting } from '../../typechain-types'
import { day, month } from '../../util/time'
import { parMap } from '../../util/promise'

export interface TokenVestingType {
  dailyRate: BigNumber, // in 10000s of percentages
  monthlyRate: BigNumber, // in 10000s of percentages
  initialRate: BigNumber, // in percentages
  lockDaysPeriod: BigNumber // in seconds
}

export const periodShareScale = 10000

export const normalDenominator = 100

export const scaledDenominator = normalDenominator * periodShareScale

export const normalShare = (numerator: BigNumberish) => share(numerator, normalDenominator)

export const scaledShare = (numerator: BigNumberish) => share(numerator, scaledDenominator)

export const zeroNormalShare = () => share(0, normalDenominator)

export const zeroScaledShare = () => share(0, scaledDenominator)

export const initialShare = normalShare

export const dailyShare = scaledShare

export const monthlyShare = scaledShare

export const dayInSeconds = toSeconds(day)

export const monthInSeconds = toSeconds(month)

export function toTokenVestingType(type: VestingType): TokenVestingType {
  const { dailyShare, monthlyShare, initialShare, cliff } = type
  assert(dailyShare.denominator.eq(BigNumber.from(scaledDenominator)))
  assert(monthlyShare.denominator.eq(BigNumber.from(scaledDenominator)))
  assert(initialShare.denominator.eq(BigNumber.from(normalDenominator)))
  return {
    dailyRate: dailyShare.numerator,
    monthlyRate: monthlyShare.numerator,
    initialRate: initialShare.numerator,
    lockDaysPeriod: BigNumber.from(toSeconds(cliff)),
  }
}

export function renderTokenVestingType(type: TokenVestingType) {
  return {
    initialRate: type.initialRate.toString(),
    dailyRate: type.dailyRate.toString(),
    monthlyRate: type.monthlyRate.toString(),
    lockDaysPeriod: type.lockDaysPeriod.toString(),
  }
}

export const addVestingType = (token: GenericTokenWithVesting) => async (type: VestingType) => {
  const tokenVestingType = toTokenVestingType(type)
  console.log('tokenVestingType', renderTokenVestingType(tokenVestingType))
  const { dailyRate, monthlyRate, initialRate, lockDaysPeriod } = tokenVestingType
  return token.addVestingType(dailyRate, monthlyRate, initialRate, lockDaysPeriod)
}

export const addVestingTypes = async (token: GenericTokenWithVesting, vestingTypes: VestingType[]) => {
  return parMap(vestingTypes, addVestingType(token))
}
