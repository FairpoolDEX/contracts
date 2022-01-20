import { ContractInfo, ContractInfoSchema, getContractInfoUid } from '../models/ContractInfo'
import { getFinder, getInserter } from '../util/zod'

export const allContractInfos: ContractInfo[] = []

export const addContractInfo = getInserter('ContractInfo', ContractInfoSchema, getContractInfoUid, allContractInfos)

export const findContractInfo = getFinder(getContractInfoUid, allContractInfos)

const a = [
  {
    'network': 'mainnet',
    'address': '0x59B8c20CA527ff18e2515b68F28939d6dD3E867B',
    'type': 'UniswapV2Pair',
  },
  {
    'network': 'mainnet',
    'address': '0xa924EAe56f772626Cf13B08c2BF384db9059E3bE',
    'type': 'UniswapV2Pair',
  },
  {
    'network': 'mainnet',
    'address': '0xc77aab3c6d7dab46248f3cc3033c856171878bd5',
    'type': 'TeamFinance',
  },
  {
    'network': 'mainnet',
    'address': '0x33a4288AB7043C274AACD2c9Eb8a931c30C0288a',
    'type': 'NFTrade',
  },
]
