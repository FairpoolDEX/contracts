import { RawCSVData } from '../../util/csv'
import { BalancesMap, parseBalancesCSV } from '../../util-local/balance'
import { zero } from '../../libs/bn/util'

export async function getShieldBalancesForBullAirdropFinal(nextDatas: RawCSVData[], prevDatas: RawCSVData[], retroDatas: RawCSVData[], blacklistDatas: RawCSVData[]): Promise<BalancesMap> {
  const balances: BalancesMap = {}
  const missedAirdropsCount = 3
  await setBalancesToZeroCSV(balances, prevDatas) // old claims (need to be explicitly zeroed out)
  await addBalancesCSV(balances, nextDatas, missedAirdropsCount) // regular claims
  await addBalancesCSV(balances, retroDatas) // manual requests
  await setBalancesToZeroCSV(balances, blacklistDatas) // BULL sellers
  return balances
}

export async function addBalancesCSV(balancesMap: BalancesMap, data: RawCSVData[], multiplier = 1) {
  for (let i = 0; i < data.length; i++) {
    const $balances = await parseBalancesCSV(data[i])
    for (const key of Object.keys($balances)) {
      const $balance = $balances[key].mul(multiplier)
      if (balancesMap[key]) {
        balancesMap[key] = balancesMap[key].add($balance)
      } else {
        balancesMap[key] = $balance
      }
    }
  }
}

export async function setBalancesToZeroCSV(balances: BalancesMap, blacklistDatas: RawCSVData[]) {
  for (let i = 0; i < blacklistDatas.length; i++) {
    const $balances = await parseBalancesCSV(blacklistDatas[i])
    for (const key of Object.keys($balances)) {
      balances[key] = zero
    }
  }
}
