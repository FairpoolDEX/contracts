import { days, fromTokenAmount } from "./all.helpers"
import { BullToken } from "../../typechain/BullToken"

export const airdropStartTimestamp: number = Math.floor(new Date("2021-06-04 13:00:00 UTC").getTime() / 1000)

export const airdropClaimDuration: number = 2 * days

export const airdropStageDuration: number = 30 * days

export const burnRateNumerator = 999

export const burnRateDenominator = 1000

type Claims = { [index: string]: number }

export const claims: Claims = {
  "0xC30C915dE5FC456F00BaFea00b8fF2a24b3b384d": 100,
  "0x77BD3E7f5b353834EB93CF8076e2500BD2ADBff1": 20,
  "0x3a10757948BeAeA4e0D76bF7adc676A17E35ACc5": 400,
}

export async function getClaims(token: BullToken): Promise<Claims> {
  const _claimers = await token.getClaimers()
  const _claims: Claims = {}
  for (let i = 0; i < _claimers.length; i++) {
    _claims[_claimers[i]] = fromTokenAmount(await token.claims(_claimers[i]))
  }
  return _claims
}