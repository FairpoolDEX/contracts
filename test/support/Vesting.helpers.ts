import { BigNumber, BigNumberish } from 'ethers'
import { share } from '../../models/Share'
import { strict as assert } from 'assert'
import { toSeconds } from '../../models/Duration'
import { VestingType } from '../../models/VestingType'
import { GenericTokenWithVesting } from '../../typechain-types'

export interface TokenVestingType {
  monthlyRate: BigNumber, // in 10000s of percentages
  initialRate: BigNumber, // in percentages
  lockDaysPeriod: BigNumber // in seconds
}

export const vestingTypeRateScale = 10000

export const scaledShare = (numerator: BigNumberish) => share(numerator, vestingTypeRateScale)

export function toTokenVestingType(type: VestingType): TokenVestingType {
  const { monthlyShare, initialShare, cliff } = type
  assert(monthlyShare.denominator.eq(BigNumber.from(vestingTypeRateScale)))
  assert(initialShare.denominator.eq(BigNumber.from(vestingTypeRateScale)))
  return {
    monthlyRate: monthlyShare.numerator,
    initialRate: initialShare.numerator.div(vestingTypeRateScale),
    lockDaysPeriod: BigNumber.from(toSeconds(cliff)),
  }
}

export async function addVestingTypes(token: GenericTokenWithVesting, vestingTypes: VestingType[]) {
  return Promise.all(vestingTypes.map(type => {
    const { monthlyRate, initialRate, lockDaysPeriod } = toTokenVestingType(type)
    return token.addVestingType(monthlyRate, initialRate, lockDaysPeriod)
  }))
}
