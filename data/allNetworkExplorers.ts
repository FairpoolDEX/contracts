import { getNetworkExplorerUid, NetworkExplorer, NetworkExplorerSchema } from '../models/NetworkExplorer'
import { getFinder, getInserter } from '../util/zod'

export const allNetworkExplorers: NetworkExplorer[] = []

export const addNetworkExplorer = getInserter('NetworkExplorer', NetworkExplorerSchema, getNetworkExplorerUid, allNetworkExplorers)

export const findNetworkExplorer = getFinder(getNetworkExplorerUid, allNetworkExplorers)

addNetworkExplorer({
  name: 'mainnet',
  url: 'https://etherscan.io',
})

addNetworkExplorer({
  name: 'ropsten',
  url: 'https://ropsten.etherscan.io/',
})

addNetworkExplorer({
  name: 'bscmainnet',
  url: 'https://bscscan.com',
})

addNetworkExplorer({
  name: 'bsctestnet',
  url: 'https://testnet.bscscan.com',
})
