import { NetworkName } from '../models/NetworkName'
import { nail } from './string'

export function getJsonRpcUrl(networkName: NetworkName) {
  // return getJsonRpcUrlForGetBlock(networkName)
  return getJsonRpcUrlForAlchemy(networkName)
}

function getJsonRpcUrlForGetBlock(networkName: string) {
  switch (networkName) {
    case 'mainnet':
    case 'ropsten':
      return `https://eth.getblock.io/${networkName}/?api_key=${process.env.GETBLOCK_API_KEY}`
    default:
      throw new Error(nail(`Get the url for "${networkName}" network at https://account.getblock.io/`))
  }
}

function getJsonRpcUrlForAlchemy(networkName: string) {
  switch (networkName) {
    case 'mainnet':
      return `https://eth-${networkName}.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_API_KEY}`
    case 'ropsten':
      return `https://eth-${networkName}.alchemyapi.io/v2/${process.env.ALCHEMY_ROPSTEN_API_KEY}`
    default:
      throw new Error(nail(`Get the url for "${networkName}" network at https://dashboard.alchemyapi.io/`))
  }
}
