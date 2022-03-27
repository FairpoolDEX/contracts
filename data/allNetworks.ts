import { Network, NetworkSchema, parseNetworkUid } from '../models/Network'
import { getFinder, getInserter } from '../util/zod'

export const allNetworks: Network[] = []

export const addNetwork = getInserter('Network', NetworkSchema, parseNetworkUid, allNetworks)

export const addEVMNetwork = (network: Omit<Network, 'vm'>) => addNetwork({ ...network, vm: 'EVM' })

export const findNetwork = getFinder(parseNetworkUid, allNetworks)

export const findNetworkByChainId = (chainId: number) => allNetworks.find(n => n.chainId === chainId)

/**
 * https://hardhat.org/hardhat-network/reference/#config
 */
export const hardhat = addEVMNetwork({
  name: 'hardhat',
  chainId: 31337,
  blockGasLimit: 30000000,
})

export const mainnet = addEVMNetwork({
  name: 'mainnet',
  chainId: 1,
  blockGasLimit: 30000000, // https://etherscan.io/blocks
})

export const ropsten = addEVMNetwork({
  name: 'ropsten',
  chainId: 3,
  blockGasLimit: 8000000, // https://ropsten.etherscan.io/blocks
})

export const bscmainnet = addEVMNetwork({
  name: 'bscmainnet',
  chainId: 56,
  blockGasLimit: 85000000,
})

export const bsctestnet = addEVMNetwork({
  name: 'bsctestnet',
  chainId: 97,
  blockGasLimit: 30000000,
})
