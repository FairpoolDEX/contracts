import { CSVData } from '../../util/csv'
import { BalancesMap, parseBalancesCSV } from '../../util/balance'
import { BigNumber } from 'ethers'

export async function parseAllBalancesCSV(nextDatas: CSVData[], prevDatas: CSVData[], retroDatas: CSVData[], blacklistDatas: CSVData[]): Promise<BalancesMap> {
  const balances: BalancesMap = {}
  // const address = '0xf5396ed020a765e561f4f176b1e1d622fb6d4154'.toLowerCase()
  for (let i = 0; i < nextDatas.length; i++) {
    const _balances = await parseBalancesCSV(nextDatas[i])
    for (const key of Object.keys(_balances)) {
      const _balance = _balances[key].mul(3)
      if (balances[key]) {
        balances[key] = balances[key].add(_balance)
      } else {
        balances[key] = _balance
      }
    }
  }
  for (let i = 0; i < retroDatas.length; i++) {
    const _balances = await parseBalancesCSV(retroDatas[i])
    for (const key of Object.keys(_balances)) {
      if (balances[key]) {
        balances[key] = balances[key].add(_balances[key])
      } else {
        balances[key] = _balances[key]
      }
    }
  }
  for (let i = 0; i < prevDatas.length; i++) {
    const _balances = await parseBalancesCSV(prevDatas[i])
    for (const key of Object.keys(_balances)) {
      if (!balances[key]) {
        balances[key] = BigNumber.from(0)
      }
    }
  }
  for (let i = 0; i < blacklistDatas.length; i++) {
    const _balances = await parseBalancesCSV(blacklistDatas[i])
    for (const key of Object.keys(_balances)) {
      balances[key] = BigNumber.from(0)
    }
  }
  return balances
}
