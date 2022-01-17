import { airdropClaimDuration, airdropStageDuration, airdropStartTimestamp, burnRateDenominator, burnRateNumerator } from '../../test/support/BullToken.helpers'
import { seconds } from '../../util/time'

export default [
  airdropStartTimestamp / seconds,
  airdropClaimDuration / seconds,
  airdropStageDuration / seconds,
  burnRateNumerator,
  burnRateDenominator,
]
