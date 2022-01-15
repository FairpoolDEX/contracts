import { z } from 'zod'

export const NetworkNameSchema = z.enum(['hardhat', 'localhost', 'mainnet', 'ropsten', 'bsctestnet', 'bscmainnet', 'avaxtestnet', 'avaxmainnet'])

const { hardhat, localhost } = NetworkNameSchema.enum

export const localTestnets = [hardhat, localhost]

export type NetworkName = z.infer<typeof NetworkNameSchema>

export function isTestnet(network: NetworkName) {
  return network.includes('testnet') || localTestnets.includes(network)
}
