import { toTokenAmount } from './all.helpers'
import { dateToTimestampSeconds } from 'hardhat/internal/util/date'
import { parseCustomNamedAllocations } from '../../models/CustomNamedAllocation'
import MarsTokenVestingTypes from '../../tasks/arguments/MarsToken.vestingTypes'

export const name = 'Mars Token'

export const symbol = 'MAF'

export const maxSupply = 480000000

export const maxSupplyTokenAmount = toTokenAmount(maxSupply)

export const releaseDate = new Date('2022-08-15')

export const releaseTime = dateToTimestampSeconds(releaseDate)

export const vestingTypesForTest = MarsTokenVestingTypes

export const allocationsForTest = parseCustomNamedAllocations([
  {
    address: '0xa55C291E4e142208EdB86304dfCD89eBAbB68dAa',
    amount: toTokenAmount(81600000),
    vesting: 'Team',
  },
])
