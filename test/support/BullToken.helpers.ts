import { BigNumber } from "ethers"
import { days, toTokenAmount, toTokenAmountString } from "./all.helpers"
import fs from "fs"
import { parseAllBalancesCSV } from "../../tasks/setClaimsBullToken"
import { parseAddresses } from "../../tasks/claimBullToken"
import { Addresses, BalanceMap } from "../../types"

export const airdropStartTimestamp: number = Math.floor(Date.now() / 1000) + 5 * days

export const airdropClaimDuration: number = 2 * days

export const airdropStageDuration: number = 30 * days

export const airdropStageShareNumerator = 18 // 18% per stage

export const airdropStageShareDenominator = 100

export const airdropRate = 10000 // BULL per SHLD

export const burnRateNumerator = 999

export const burnRateDenominator = 1000

export const maxSupply = 969163000 * airdropRate

export const deployedAddress = "0x1bb022ab668085c6417b7d7007b0fbd53bacc383"

export function fromShieldToBull(bn: BigNumber): BigNumber {
  return bn.mul(airdropStageShareNumerator).div(airdropStageShareDenominator).mul(airdropRate)
}

type Claims = { [index: string]: string }

export const claims: Claims = {
  "0xC30C915dE5FC456F00BaFea00b8fF2a24b3b384d": toTokenAmountString("100"),
  "0x77BD3E7f5b353834EB93CF8076e2500BD2ADBff1": toTokenAmountString("20"),
  "0x3a10757948BeAeA4e0D76bF7adc676A17E35ACc5": toTokenAmountString("400"),
}

export async function getClaims(token: any, claimers: string[]): Promise<Claims> {
  const _claims: Claims = {}
  for (let i = 0; i < claimers.length; i++) {
    _claims[claimers[i]] = (await token.claims(claimers[i])).toString()
  }
  return _claims
}

export async function getTestBalances(): Promise<BalanceMap> {
  const balancesCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.balances.csv`)
  const extrasCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.extras.csv`)
  const oldCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.olds.csv`)
  const blacklistCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.blacklist.csv`)
  return parseAllBalancesCSV([balancesCSV, extrasCSV], [oldCSV], [blacklistCSV])
}

export async function getBogusBalances(): Promise<BalanceMap> {
  const tooLongFormatCSV = fs.readFileSync(`${__dirname}/../fixtures/SHLD.too-long-format.csv`)
  return parseAllBalancesCSV([tooLongFormatCSV], [], [])
}

export async function getTestAddresses(): Promise<Addresses> {
  const testAddressesBuffer = fs.readFileSync(`${__dirname}/../fixtures/addresses.csv`)
  return parseAddresses(testAddressesBuffer)
}

