import { maxSupplyTokenAmount, name, symbol } from '../../test/support/MarsToken.helpers'
import { dateToTimestampSeconds } from 'hardhat/internal/util/date'

const releaseTime = dateToTimestampSeconds(new Date())

export default [name, symbol, maxSupplyTokenAmount, releaseTime]
