import { toTokenAmount } from './all.helpers'
import { dateToTimestampSeconds } from 'hardhat/internal/util/date'

export const name = 'Mars Token'

export const symbol = 'MAF'

export const maxSupply = 480000000

export const maxSupplyTokenAmount = toTokenAmount(maxSupply)

export const releaseDate = new Date('2022-07-30')

export const releaseTime = dateToTimestampSeconds(releaseDate)
