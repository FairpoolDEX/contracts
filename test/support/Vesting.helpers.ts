import { BigNumber, BigNumberish } from 'ethers'
import { share } from '../../models/Share'
import { strict as assert } from 'assert'
import { toSeconds } from '../../models/Duration'
import { VestingType } from '../../models/VestingType'
import { GenericTokenWithVesting } from '../../typechain-types'
import { day, month } from '../../util/time'

export interface TokenVestingType {
  dailyRate: BigNumber, // in 10000s of percentages
  monthlyRate: BigNumber, // in 10000s of percentages
  initialRate: BigNumber, // in percentages
  lockDaysPeriod: BigNumber // in seconds
}

export const percentDenominator = 100

const vestingTypeRateScale = 10000

export const vestingTypeRateDenominator = percentDenominator * vestingTypeRateScale

export const normalShare = (numerator: BigNumberish) => share(numerator, percentDenominator)

export const scaledShare = (numerator: BigNumberish) => share(numerator, vestingTypeRateDenominator)

export const zeroShare = () => share(0, vestingTypeRateDenominator)

export const dayInSeconds = toSeconds(day)

export const monthInSeconds = toSeconds(month)

export function toTokenVestingType(type: VestingType): TokenVestingType {
  const { dailyShare, monthlyShare, initialShare, cliff } = type
  assert(dailyShare.denominator.eq(BigNumber.from(vestingTypeRateDenominator)))
  assert(monthlyShare.denominator.eq(BigNumber.from(vestingTypeRateDenominator)))
  assert(initialShare.denominator.eq(BigNumber.from(percentDenominator)))
  return {
    dailyRate: dailyShare.numerator,
    monthlyRate: monthlyShare.numerator,
    initialRate: initialShare.numerator,
    lockDaysPeriod: BigNumber.from(toSeconds(cliff)),
  }
}

export const addVestingType = (token: GenericTokenWithVesting) => async (type: VestingType) => {
  const { dailyRate, monthlyRate, initialRate, lockDaysPeriod } = toTokenVestingType(type)
  return token.addVestingType(dailyRate, monthlyRate, initialRate, lockDaysPeriod)
}

export const addVestingTypes = async (token: GenericTokenWithVesting, vestingTypes: VestingType[]) => {
  return Promise.all(vestingTypes.map(addVestingType(token)))
}
