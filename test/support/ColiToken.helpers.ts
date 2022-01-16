import { toTokenAmount } from './all.helpers'
import { getRewriteAddressMap, RewriteAddressMap } from '../../util/address'
import { validateBlockNumber } from '../../models/BlockNumber'
import { dateToTimestampSeconds } from 'hardhat/internal/util/date'
import { days, seconds } from '../../util/time'

export const releaseTime = 1621429200

export const releasePeriodInMilliseconds = 30 * days

export const maxSupply = 969163000

export const maxSupplyTokenAmount = toTokenAmount(maxSupply)

export const deployedAt = validateBlockNumber(12463796)

export const releaseTimeTest = dateToTimestampSeconds(new Date('2022.01.01 13:00:00 UTC'))

// @note: All values is set without decimals
export const allocationsForTest: { [index: string]: { [index: string]: number } } = {

  // Seed:	Locked for 1 month, 5% on first release, then equal parts of 12% over total of 9 months
  '0': {
    '0xC30C915dE5FC456F00BaFea00b8fF2a24b3b384d': 100,
    '0x77BD3E7f5b353834EB93CF8076e2500BD2ADBff1': 20,
    '0x3a10757948BeAeA4e0D76bF7adc676A17E35ACc5': 400,
  },
  // Private:	10% at listing, then equal parts of 18% over total of 6 months
  '1': {
    '0x62baee26eB52E0D43ed003017833E7701C2e037B': 100,
    '0xAbAE711bC28b21D91bC473191A379F548Cb183ba': 20,
  },
  // Public:	100% at listing
  '2': {
    '0x379e7d7f64784f80888dcda6909fb1ef057412c6': 100,
    '0xbbe9c7eeb523187bf6a53396b21ce985caa3f796': 20,
  },
// // Advisory:	Locked for 1 month, 4% on first release, then equal parts of 4% over total of 24 months
//   '3': {
//     '0xdeadbeef': 77,
//     '0x1337': 42,
//   },
// // Team:	Locked for 12 months, 8% on first release, then equal parts of 8% over total of 12 months
//   '4': {
//     '0xdeadbeef': 77,
//     '0x1337': 42,
//   },
// // Development:	Locked for 6 months, 3% on first release, then equal parts of 3% over total of 36 months
//   '5': {
//     '0xdeadbeef': 77,
//     '0x1337': 42,
//   },
// // Marketing:	Locked for 3 months, 2% on first release, then equal parts of 2% over total of 48 months
//   '6': {
//     '0xdeadbeef': 77,
//     '0x1337': 42,
//   },
// // Liquidity provisioning:	100% at listing
//   '7': {
//     '0xdeadbeef': 77,
//     '0x1337': 42,
//   },
// // Liquidity mining:	8% at listing, then equal parts of 8% over total of 12 months
//   '8': {
//     '0xdeadbeef': 77,
//     '0x1337': 42,
//   },
// // General Reserve:	Locked for 6 months, 2% on first release, then equal parts of 2% over total of 60 months
//   '9': {
//     '0xdeadbeef': 77,
//     '0x1337': 42,
//   },
}

export const coliRewriteAddressMap: RewriteAddressMap = getRewriteAddressMap([
  ['0xc77aab3c6d7dab46248f3cc3033c856171878bd5', '0x7dcbefb3b9a12b58af8759e0eb8df05656db911d'], // locked liquidity
  ['0x33a4288AB7043C274AACD2c9Eb8a931c30C0288a', '0x0000000000000000000000000000000000000000'], // NFTrade pool
])

export function getReleasePeriodsElapsed(now: Date) {
  const timeElapsed = now.getTime() - releaseTime * seconds
  const val = Math.floor(timeElapsed / releasePeriodInMilliseconds)
  return val
}
