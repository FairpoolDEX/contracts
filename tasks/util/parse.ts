import { RawCSVData } from '../../util/csv'
import { BalancesMap, parseBalancesCSV } from '../../util/balance'
import { zero } from '../../util/bignumber'

export async function getShieldBalancesForBullAirdropFinal(nextDatas: RawCSVData[], prevDatas: RawCSVData[], retroDatas: RawCSVData[], blacklistDatas: RawCSVData[]): Promise<BalancesMap> {
  const balances: BalancesMap = {}
  const missedAirdropsCount = 3
  await setBalancesToZero(balances, prevDatas) // old claims (need to be explicitly zeroed out)
  await addBalances(balances, nextDatas, missedAirdropsCount) // regular claims
  await addBalances(balances, retroDatas) // manual requests
  await setBalancesToZero(balances, blacklistDatas) // BULL sellers
  return balances
}

export async function addBalances(balances: BalancesMap, data: RawCSVData[], multiplier = 1) {
  for (let i = 0; i < data.length; i++) {
    const $balances = await parseBalancesCSV(data[i])
    for (const key of Object.keys($balances)) {
      const $balance = $balances[key].mul(multiplier)
      if (balances[key]) {
        balances[key] = balances[key].add($balance)
      } else {
        balances[key] = $balance
      }
    }
  }
}

export async function setBalancesToZero(balances: BalancesMap, blacklistDatas: RawCSVData[]) {
  for (let i = 0; i < blacklistDatas.length; i++) {
    const $balances = await parseBalancesCSV(blacklistDatas[i])
    for (const key of Object.keys($balances)) {
      balances[key] = zero
    }
  }
}
