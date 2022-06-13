import { parseVestingTypes } from '../../models/VestingType'
import { initialShare, monthlyShare, periodShareScale, scaledShare } from '../../test/support/Vesting.helpers'
import { day, month, months } from '../../util/time'
import { Duration } from '../../models/Duration'

export function dailyShareDuration(duration: Duration) {
  return linearVesting(day, duration)
}

export function linearVesting(interval: Duration, duration: Duration) {
  const periods = duration / interval
  const numerator = Math.trunc(periodShareScale * 100 / periods)
  return scaledShare(numerator)
}

export default parseVestingTypes([
  {
    name: 'Team',
    initialShare: initialShare(0),
    dailyShare: dailyShareDuration(36 * months),
    monthlyShare: monthlyShare(0),
    cliff: 12 * months,
  },
  {
    name: 'Ecosystem',
    initialShare: initialShare(0),
    dailyShare: dailyShareDuration(60 * months),
    monthlyShare: monthlyShare(0),
    cliff: 6 * months,
  },
  {
    name: 'Reserve',
    initialShare: initialShare(0),
    dailyShare: dailyShareDuration(60 * months),
    monthlyShare: monthlyShare(0),
    cliff: 18 * months,
  },
  {
    name: 'Seed',
    initialShare: initialShare(0),
    dailyShare: dailyShareDuration(9 * months),
    monthlyShare: monthlyShare(0),
    cliff: month,
  },
  {
    name: 'Private',
    initialShare: initialShare(20),
    dailyShare: dailyShareDuration(6 * months),
    monthlyShare: monthlyShare(0),
    cliff: 0,
  },
  {
    name: 'Public',
    initialShare: initialShare(80),
    dailyShare: dailyShareDuration(4 * months),
    monthlyShare: monthlyShare(0),
    cliff: 0,
  },
  // Liquidity vesting type is not included because it's 100% unlocked at TGE
  {
    name: 'Marketing',
    initialShare: initialShare(0),
    dailyShare: dailyShareDuration(36 * months),
    monthlyShare: monthlyShare(0),
    cliff: 2 * months,
  },
  {
    name: 'Development',
    initialShare: initialShare(0),
    dailyShare: dailyShareDuration(60 * months),
    monthlyShare: monthlyShare(0),
    cliff: 10 * months,
  },
  {
    name: 'Advisors',
    initialShare: initialShare(0),
    dailyShare: dailyShareDuration(24 * months),
    monthlyShare: monthlyShare(0),
    cliff: 2 * months,
  },
])
