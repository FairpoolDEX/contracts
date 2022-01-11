import { BigNumber } from 'ethers'
import { days, toTokenAmount, toTokenAmountString } from './all.helpers'
import { maxSupply as shieldMaxSupply } from './ShieldToken.helpers'
import fs from 'fs'
import { SetClaimsContext, SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { parseAddresses } from '../../tasks/claimBullTokenTask'
import { Deployment } from '../../util/deployment'
import { BalancesMap, sumBalanceAmounts } from '../../util/balance'
import { Address } from '../../models/Address'
import { getShieldBalancesForBullAirdropFinal } from '../../tasks/util/parse'
import { AmountBN } from '../../models/AmountBN'
import { BalanceBN } from '../../models/BalanceBN'
import { todo } from '../../util/todo'

export const airdropStartTimestampForTest = Math.floor(Date.now() / 1000) + 5 * days

export const airdropStartTimestamp = 1622811600

export const airdropClaimDuration = 2 * days

export const airdropStageDuration = 30 * days

export const airdropStageMaxCount = 5 // stages

export const airdropStageShareNumerator = 18 // 18% per stage

export const airdropStageShareDenominator = 100

export const airdropRate = 10000 // BULL per SHLD

export const airdropDefaultMultiplier = getMultiplier(airdropStageShareNumerator, airdropStageShareDenominator, airdropRate)

export const burnRateNumerator = 999

export const burnRateDenominator = 1000

export const maxSupply = shieldMaxSupply * airdropRate

export const maxSupplyTokenAmount = toTokenAmount(maxSupply)

export const distributedTokenAmount = airdropDefaultMultiplier(maxSupplyTokenAmount).mul(airdropStageMaxCount)

export const deployments: Deployment[] = [
  {
    network: 'mainnet',
    address: '0x1bb022ab668085c6417b7d7007b0fbd53bacc383',
  },
]

export const fromShieldToBull = airdropDefaultMultiplier

type Claims = { [index: string]: string }

export const claims: Claims = {
  '0xC30C915dE5FC456F00BaFea00b8fF2a24b3b384d': toTokenAmountString('100'),
  '0x77BD3E7f5b353834EB93CF8076e2500BD2ADBff1': toTokenAmountString('20'),
  '0x3a10757948BeAeA4e0D76bF7adc676A17E35ACc5': toTokenAmountString('400'),
}

export async function getClaims(token: any, claimers: string[]): Promise<Claims> {
  const _claims: Claims = {}
  for (let i = 0; i < claimers.length; i++) {
    _claims[claimers[i]] = (await token.claims(claimers[i])).toString()
  }
  return _claims
}

export async function setDefaultAmounts(balancesMap: BalancesMap, addresses: Address[], defaultAmount: AmountBN) {
  for (let i = 0; i < addresses.length; i++) {
    balancesMap[addresses[i]] = defaultAmount
  }
  return balancesMap
}

export async function getTestBalanceMap(): Promise<BalancesMap> {
  const balancesCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.balances.csv`)
  const extrasCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.extras.csv`)
  const oldCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.olds.csv`)
  const blacklistCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.blacklist.csv`)
  return getShieldBalancesForBullAirdropFinal([], [oldCSV], [balancesCSV, extrasCSV], [blacklistCSV])
}

export async function getTestExpectations(balances: BalanceBN[], context: SetClaimsContext): Promise<SetClaimsExpectationsMap> {
  // const totalSHLDAmountMax = maxSupplyBN.mul(2) // it's OK to multiply by 2, because extra claims from previous period would make the totalSHLDAmount go over shieldMaxSupplyTokenAmount
  const { airdropStageShareNumerator, airdropStageShareDenominator, airdropRate } = context
  const multiply = getMultiplier(airdropStageShareNumerator, airdropStageShareDenominator, airdropRate)
  return {
    balances: {},
    totalAmount: multiply(sumBalanceAmounts(balances)),
  }
}

export async function getBogusBalances(): Promise<BalancesMap> {
  const tooLongFormatCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.too-long-format.csv`)
  return getShieldBalancesForBullAirdropFinal([tooLongFormatCSV], [], [], [])
}

export async function getTestAddresses(): Promise<Address[]> {
  const testAddressesBuffer = fs.readFileSync(`${__dirname}/../fixtures/addresses.csv`)
  return parseAddresses(testAddressesBuffer)
}

export function getMultiplier(airdropStageShareNumerator: number, airdropStageShareDenominator: number, airdropRate: number) {
  // NOTE: this expression truncates the fractional part, so the total distributed amount is guaranteed to be lower than 90% of max supply
  return (amount: AmountBN) => amount.mul(airdropRate).mul(airdropStageShareNumerator).div(airdropStageShareDenominator)
}

export const bannedAddressesTokenAmount = todo(BigNumber.from(0))
