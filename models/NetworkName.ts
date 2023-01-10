import { z } from 'zod'

export const NetworkNameSchema = z.enum(['hardhat', 'localhost', 'mainnet', 'goerli', 'ropsten', 'rinkeby', 'bsctestnet', 'bscmainnet', 'avaxtestnet', 'avaxmainnet'])

const { hardhat, localhost } = NetworkNameSchema.enum

export type NetworkName = z.infer<typeof NetworkNameSchema>

export const localTestnets: NetworkName[] = [hardhat, localhost]

export function validateNetworkName(name: NetworkName | string) {
  return NetworkNameSchema.parse(name)
}

export function isTestnet(network: NetworkName) {
  return network.includes('testnet') || localTestnets.includes(network)
}
