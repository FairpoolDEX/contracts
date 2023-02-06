import { NetworkName } from '../libs/ethereum/models/NetworkName'
import { nail } from '../libs/utils/string'

export function getJsonRpcUrl(networkName: NetworkName) {
  switch (networkName) {
    case 'mainnet':
      return `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_MAINNET}`
    case 'goerli':
      return `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_GOERLI}`
    case 'ropsten':
      return `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_ROPSTEN}`
    case 'rinkeby':
      return `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_RINKEBY}`
    case 'bnbmainnet':
      return `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_API_KEY}/bsc/mainnet/archive`
    case 'bnbtestnet':
      return `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_API_KEY}/bsc/testnet/archive`
    case 'cantomainnet':
      return 'https://canto.slingshot.finance'
    case 'cantotestnet':
      return 'https://eth.plexnode.wtf/'
    default:
      throw new Error(nail(`Get the url for "${networkName}" network at https://account.getblock.io/ or https://dashboard.alchemyapi.io/`))
  }
}
