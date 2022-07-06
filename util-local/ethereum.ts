import { NetworkName } from '../models/NetworkName'
import { nail } from '../util/string'

export function getJsonRpcUrl(networkName: NetworkName) {
  switch (networkName) {
    case 'mainnet':
      return `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_API_KEY}`
    case 'ropsten':
      return `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_ROPSTEN_API_KEY}`
    case 'bscmainnet':
      return `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_API_KEY}/bsc/mainnet/archive`
    case 'bsctestnet':
      return `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_API_KEY}/bsc/testnet/archive`
    default:
      throw new Error(nail(`Get the url for "${networkName}" network at https://account.getblock.io/ or https://dashboard.alchemyapi.io/`))
  }
}
