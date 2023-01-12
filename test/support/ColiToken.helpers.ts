import { toTokenAmount } from './all.helpers'
import { getRewriteAddressMap, RewriteAddressMap } from '../../util-local/address'
import { parseBlockNumber } from '../../libs/ethereum/models/BlockNumber'
import { dateToTimestampSeconds } from 'hardhat/internal/util/date'
import { days, month, seconds } from '../../util-local/time'
import { parseVestingTypes } from '../../models/VestingType'
import { normalShare, scaledDenominator, scaledShare, zeroScaledShare } from './Vesting.helpers'
import { AmountNum } from '../../util-local/types'
import { Address } from '../../models/Address'

export const shieldDecimals = 18

export const releaseTime = 1621429200

export const releasePeriodInMilliseconds = 30 * days

export const maxSupply = 969163000

export const maxSupplyTokenAmount = toTokenAmount(maxSupply)

export const deployedAt = parseBlockNumber(12463796)

export const releaseTimeTest = dateToTimestampSeconds(new Date('2022.01.01 13:00:00 UTC'))

export const vestingTypesForTest = parseVestingTypes([
  {
    // Seed:	Locked for 1 month, 5% on first release, then equal parts of 10.556% over total of 9 months
    name: 'Seed',
    initialShare: normalShare(5),
    monthlyShare: scaledShare(105556),
    dailyShare: zeroScaledShare(),
    cliff: month,
    smartContractIndex: 0,
  },
  {
    // Private:	10% at listing, then equal parts of 15% over total of 6 months
    name: 'Private',
    initialShare: normalShare(10),
    monthlyShare: scaledShare(15 * scaledDenominator),
    dailyShare: zeroScaledShare(),
    cliff: 0,
    smartContractIndex: 1,
  },
  {
    // Advisory:	Locked for 1 month, 4% on first release, then equal parts of 4% over total of 24 months
    name: 'Advisory',
    initialShare: normalShare(4),
    monthlyShare: scaledShare(4 * scaledDenominator),
    dailyShare: zeroScaledShare(),
    cliff: month,
    smartContractIndex: 2,
  },
  {
    // Team:	Locked for 12 months, 8% on first release, then equal parts of 7.667% over total of 12 months
    name: 'Team',
    initialShare: normalShare(8),
    monthlyShare: scaledShare(76667),
    dailyShare: zeroScaledShare(),
    cliff: 12 * month,
    smartContractIndex: 3,
  },
  {
    // Development:	Locked for 6 months, 3% on first release, then equal parts of 2.694% over total of 36 months
    name: 'Development',
    initialShare: normalShare(3),
    monthlyShare: scaledShare(26945),
    dailyShare: zeroScaledShare(),
    cliff: 6 * month,
    smartContractIndex: 4,
  },
  {
    // Marketing:	Locked for 3 months, 2% on first release, then equal parts of 2.041% over total of 48 months
    name: 'Marketing',
    initialShare: normalShare(2),
    monthlyShare: scaledShare(20417),
    dailyShare: zeroScaledShare(),
    cliff: 3 * month,
    smartContractIndex: 5,
  },
  {
    // Liquidity mining:	8% at listing, then equal parts of 7.666% over total of 12 months
    name: 'Liquidity mining',
    initialShare: normalShare(8),
    monthlyShare: scaledShare(76667),
    dailyShare: zeroScaledShare(),
    cliff: 0,
    smartContractIndex: 6,
  },
  {
    // General Reserve:	Locked for 6 months, 2% on first release, then equal parts of 1.633% over total of 60 months
    name: 'General Reserve',
    initialShare: normalShare(2),
    monthlyShare: scaledShare(16334),
    dailyShare: zeroScaledShare(),
    cliff: 6 * month,
    smartContractIndex: 7,
  },
])

export type AllocationsForTest = { [vestingIndex: string]: { [address: string]: AmountNum } }

export function getAllocationsForTest(addresses: Address[]): AllocationsForTest {
  let i = 0
  return {
    // Seed:	Locked for 1 month, 5% on first release, then equal parts of 12% over total of 9 months
    '0': {
      [addresses[i++]]: 100,
      [addresses[i++]]: 20,
      [addresses[i++]]: 400,
    },
    // Private:	10% at listing, then equal parts of 18% over total of 6 months
    '1': {
      [addresses[i++]]: 100,
      [addresses[i++]]: 20,
    },
    // Public:	100% at listing
    '2': {
      [addresses[i++]]: 100,
      [addresses[i++]]: 20,
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
