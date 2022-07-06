import { airdropClaimDuration, airdropStageDuration, burnRateDenominator, burnRateNumerator } from '../../test/support/BullToken.helpers'
import { seconds } from '../../util-local/time'
import { DateTime } from 'luxon'

// const airdropStartTimestamp = DateTime.utc().startOf('day').set({ hour: 13 }).toJSDate().getTime()

const airdropStartTimestamp = DateTime.utc().startOf('second').toJSDate().getTime()

export default [
  airdropStartTimestamp / seconds,
  airdropClaimDuration / seconds,
  airdropStageDuration / seconds,
  burnRateNumerator,
  burnRateDenominator,
]
