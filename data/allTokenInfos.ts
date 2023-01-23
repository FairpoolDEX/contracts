import { parseTokenInfoUid, TokenInfo, TokenInfoSchema } from '../models/TokenInfo'
import { getFinder, getInserter } from '../utils/zod'

export const allTokenInfos: TokenInfo[] = []

export const addTokenInfo = getInserter('TokenInfo', TokenInfoSchema, parseTokenInfoUid, allTokenInfos)

export const findTokenInfo = getFinder(parseTokenInfoUid, allTokenInfos)

export const ColiEthMainnetContract = addTokenInfo({
  symbol: 'COLI',
  network: 'mainnet',
  address: '0xd49EFA7BC0D339D74f487959C573d518BA3F8437',
  multiplier: 5,
})

export const ColibnbmainnetContract = addTokenInfo({
  symbol: 'COLI',
  network: 'bnbmainnet',
  address: '0x3470C81026C8085b7B743695f851353043Ff0d0D',
  multiplier: 5,
})

export const BusdEthMainnetContract = addTokenInfo({
  symbol: 'BUSD',
  network: 'mainnet',
  address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
})

export const BusdbnbmainnetContract = addTokenInfo({
  symbol: 'BUSD',
  network: 'bnbmainnet',
  address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
})

export const UsdtEthMainnetContract = addTokenInfo({
  symbol: 'USDT',
  network: 'mainnet',
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
})

export const UsdtbnbmainnetContract = addTokenInfo({
  symbol: 'USDT',
  network: 'bnbmainnet',
  address: '0x55d398326f99059ff775485246999027b3197955',
})

export const UsdcEthMainnetContract = addTokenInfo({
  symbol: 'USDC',
  network: 'mainnet',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
})

export const UsdcbnbmainnetContract = addTokenInfo({
  symbol: 'USDC',
  network: 'bnbmainnet',
  address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
})

export const DaiEthMainnetContract = addTokenInfo({
  symbol: 'DAI',
  network: 'mainnet',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
})

export const DaibnbmainnetContract = addTokenInfo({
  symbol: 'DAI',
  network: 'bnbmainnet',
  address: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
})
